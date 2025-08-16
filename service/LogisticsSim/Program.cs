using System.Data;
using System.Numerics;
using Bogus;
using Dapper;
using MySqlConnector;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Hosting.WindowsServices;


var builder = Host.CreateDefaultBuilder(args)
    .UseWindowsService() // If run on Windows, enables service behavior. Works fine in console too.
    .ConfigureAppConfiguration((hosting, config) =>
    {
        config.AddJsonFile("appsettings.json", optional: true, reloadOnChange: true);
        config.AddEnvironmentVariables(prefix: "LOGSIM_");
    })
    .ConfigureServices((ctx, services) =>
    {
        services.AddSingleton(new DbConfig
        {
            ConnectionString = ctx.Configuration.GetConnectionString("MySql") ??
                               "Server=localhost;Port=3306;Database=logistics_db;User Id=root;Password=Fahad@eqbal22;SslMode=None;"
        });
        services.AddSingleton(ctx.Configuration.GetSection("Simulation").Get<SimulationOptions>() ?? new SimulationOptions());
        services.AddHostedService<SimulatorWorker>();
    });

await builder.Build().RunAsync();

// -----------------------------------------------------------------------------
// Config types
// -----------------------------------------------------------------------------
public record DbConfig
{
    public required string ConnectionString { get; init; }
}

public class SimulationOptions
{
    public int TickMs { get; set; } = 1000;
    public int TargetCustomers { get; set; } = 50;
    public int TargetDrivers { get; set; } = 15;
    public int TargetManagers { get; set; } = 3;
    public int MaxOpenShipments { get; set; } = 60;
    public int MaxShipmentsPerTick { get; set; } = 5;
    public double MinMetersPerTick { get; set; } = 50.0;
    public double MaxMetersPerTick { get; set; } = 200.0;
    public double DeliveryFailRate { get; set; } = 0.05; // 5% fail
}

// -----------------------------------------------------------------------------
// Worker
// -----------------------------------------------------------------------------
public class SimulatorWorker : BackgroundService
{
    private readonly ILogger<SimulatorWorker> _log;
    private readonly DbConfig _db;
    private readonly SimulationOptions _opt;
    private readonly Faker _faker = new("en_IND");

    public SimulatorWorker(ILogger<SimulatorWorker> log, DbConfig db, SimulationOptions opt)
    {
        _log = log;
        _db = db;
        _opt = opt;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _log.LogInformation("LogisticsSim starting up...");

        await using var conn = new MySqlConnection(_db.ConnectionString);
        await conn.OpenAsync(stoppingToken);

        await EnsureWarehouses(conn);

        var lastUserSeed = DateTime.MinValue;
        var lastVehicleEnsure = DateTime.MinValue;
        var lastShipmentCreate = DateTime.MinValue;
        var lastAdvance = DateTime.MinValue;

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTime.UtcNow;

                if ((now - lastUserSeed).TotalSeconds > 10)
                {
                    await EnsureUsers(conn);
                    lastUserSeed = now;
                }

                if ((now - lastVehicleEnsure).TotalSeconds > 10)
                {
                    await EnsureVehiclesForDrivers(conn);
                    lastVehicleEnsure = now;
                }

                if ((now - lastShipmentCreate).TotalSeconds > 5)
                {
                    await CreateShipmentsIfNeeded(conn);
                    lastShipmentCreate = now;
                }

                if ((now - lastAdvance).TotalSeconds > 1)
                {
                    await AdvanceShipmentsAndMoveVehicles(conn);
                    lastAdvance = now;
                }
            }
            catch (Exception ex)
            {
                _log.LogError(ex, "Simulation loop error");
            }

            await Task.Delay(_opt.TickMs, stoppingToken);
        }
    }

    // ---------------------------------------------------------------------
    // Seeds & Ensures
    // ---------------------------------------------------------------------
    private async Task EnsureWarehouses(MySqlConnection conn)
    {
        var count = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM warehouses");
        if (count > 0) return;

        // Seed a few Indian city hubs
        var hubs = new[]
        {
            new { Name = "Delhi Hub",     Lat = 28.6139m, Lng = 77.2090m },
            new { Name = "Mumbai Hub",    Lat = 19.0760m, Lng = 72.8777m },
            new { Name = "Bengaluru Hub", Lat = 12.9716m, Lng = 77.5946m },
            new { Name = "Kolkata Hub",   Lat = 22.5726m, Lng = 88.3639m }
        };

        foreach (var h in hubs)
        {
            await conn.ExecuteAsync(
                "INSERT INTO warehouses(name, latitude, longitude) VALUES(@n,@lat,@lng)",
                new { n = h.Name, lat = h.Lat, lng = h.Lng });
        }
    }

    private async Task EnsureUsers(MySqlConnection conn)
    {
        // target counts per role
        var target = new Dictionary<string, int>
        {
            ["customer"] = _opt.TargetCustomers,
            ["driver"] = _opt.TargetDrivers,
            ["manager"] = _opt.TargetManagers,
        };

        foreach (var kv in target)
        {
            var role = kv.Key;
            var want = kv.Value;
            var have = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM users WHERE role=@r", new { r = role });
            var toCreate = Math.Max(0, want - have);
            for (int i = 0; i < toCreate; i++)
            {
                var name = _faker.Name.FullName();
                var email = _faker.Internet.Email().ToLowerInvariant();
                var pwdHash = _faker.Random.Hash(); // placeholder; not used by sim
                try
                {
                    await conn.ExecuteAsync(
                        "INSERT INTO users(name,email,password_hash,role) VALUES(@n,@e,@p,@r)",
                        new { n = name, e = email, p = pwdHash, r = role });
                }
                catch (MySqlException ex) when (ex.Number == 1062)
                {
                    // duplicate email - try another
                    i--; continue;
                }
            }
        }
    }

    private async Task EnsureVehiclesForDrivers(MySqlConnection conn)
    {
        // Any driver without a vehicle gets one at a random warehouse location
        var drivers = await conn.QueryAsync<(long id, string name)>("SELECT id, name FROM users WHERE role='driver'");
        foreach (var d in drivers)
        {
            var hasVehicle = await conn.ExecuteScalarAsync<int>("SELECT COUNT(*) FROM vehicles WHERE driver_id=@id", new { id = d.id });
            if (hasVehicle > 0) continue;

            var hub = await conn.QuerySingleAsync<(decimal lat, decimal lng)>("SELECT latitude, longitude FROM warehouses ORDER BY RAND() LIMIT 1");
            await conn.ExecuteAsync(
                "INSERT INTO vehicles(driver_id,current_lat,current_lng) VALUES(@driver,@lat,@lng)",
                new { driver = d.id, lat = hub.lat, lng = hub.lng });
        }
    }

    // ---------------------------------------------------------------------
    // Shipments: create and advance
    // ---------------------------------------------------------------------
    private async Task CreateShipmentsIfNeeded(MySqlConnection conn)
    {
        var openCount = await conn.ExecuteScalarAsync<int>(
            "SELECT COUNT(*) FROM shipments WHERE status IN ('pending','in_transit')");

        if (openCount >= _opt.MaxOpenShipments) return;

        var createNow = Math.Min(_opt.MaxShipmentsPerTick, _opt.MaxOpenShipments - openCount);

        var customers = (await conn.QueryAsync<long>(
            "SELECT id FROM users WHERE role='customer' ORDER BY RAND() LIMIT @n",
            new { n = createNow * 2 })
        ).ToList();

        var drivers = (await conn.QueryAsync<long>(
            "SELECT id FROM users WHERE role='driver' ORDER BY RAND() LIMIT @n",
            new { n = createNow * 2 })
        ).ToList();

        var hubs = (await conn.QueryAsync<(long id, decimal lat, decimal lng)>(
            "SELECT id, latitude, longitude FROM warehouses")
        ).ToList();

        if (hubs.Count == 0 || customers.Count == 0 || drivers.Count == 0) return;

        for (int i = 0; i < createNow; i++)
        {
            var cust = customers[_faker.Random.Int(0, customers.Count - 1)];
            var drv = drivers[_faker.Random.Int(0, drivers.Count - 1)];
            var hub = hubs[_faker.Random.Int(0, hubs.Count - 1)];

            var tracking = "TRK-" + _faker.Random.AlphaNumeric(10).ToUpperInvariant();
            var destAddr = _faker.Address.FullAddress();

            // pick a pseudo-destination lat/lng near hub
            var (destLat, destLng) = MakePseudoDestination(hub.lat, hub.lng);

            var shipmentId = await conn.ExecuteScalarAsync<long>(
                @"INSERT INTO shipments(driver_id, tracking_number, origin_warehouse_id, 
                                    destination_address, destination_latitude, destination_longitude, 
                                    customer_id, status)
              VALUES(@driver,@tracking,@origin,@dest,@dlat,@dlng,@cust,'pending');
              SELECT LAST_INSERT_ID();",
                new { driver = drv, tracking, origin = hub.id, dest = destAddr, dlat = destLat, dlng = destLng, cust });

            // shipment starts as 'pending', first "picked_up" event comes when driver moves
        }
    }


    private async Task AdvanceShipmentsAndMoveVehicles(MySqlConnection conn)
    {
        // Pull active shipments + driver vehicle state + origin + destination coords
        // Group shipments by driver so each driver can handle multiple shipments
        var active = (await conn.QueryAsync<ActiveShipment>(
            @"SELECT s.id AS ShipmentId, s.driver_id AS DriverId, s.status AS ShipStatus,
                 s.destination_latitude AS DestLat, s.destination_longitude AS DestLng,
                 w.latitude AS OriginLat, w.longitude AS OriginLng,
                 v.id AS VehicleId, v.current_lat AS VehLat, v.current_lng AS VehLng
          FROM shipments s
          JOIN warehouses w ON w.id = s.origin_warehouse_id
          JOIN vehicles v   ON v.driver_id = s.driver_id
          WHERE s.status IN ('pending','in_transit')")).ToList();

        // Group shipments by driver
        var groupedByDriver = active.GroupBy(s => s.DriverId);

        foreach (var driverShipments in groupedByDriver)
        {
            // Use the driver's vehicle for all shipments
            var vehicle = driverShipments.First();

            foreach (var sh in driverShipments)
            {
                var destLat = sh.DestLat;
                var destLng = sh.DestLng;

                if (sh.ShipStatus == "pending")
                {
                    await conn.ExecuteAsync(
                        "INSERT INTO shipment_events(shipment_id,status,latitude,longitude) VALUES(@sid,'picked_up',@lat,@lng)",
                        new { sid = sh.ShipmentId, lat = vehicle.VehLat, lng = vehicle.VehLng });

                    await conn.ExecuteAsync("UPDATE shipments SET status='in_transit' WHERE id=@id", new { id = sh.ShipmentId });
                    sh.ShipStatus = "in_transit";
                }

                var (nlat, nlng, arrived) = StepTowards(vehicle.VehLat, vehicle.VehLng, destLat, destLng,
                    _faker.Random.Double(_opt.MinMetersPerTick, _opt.MaxMetersPerTick));

                // Update vehicle position only once per tick per driver
                vehicle.VehLat = nlat;
                vehicle.VehLng = nlng;

                await conn.ExecuteAsync(
                    "UPDATE vehicles SET current_lat=@lat, current_lng=@lng, last_update=UTC_TIMESTAMP() WHERE id=@vid",
                    new { lat = nlat, lng = nlng, vid = vehicle.VehicleId });

                await conn.ExecuteAsync(
                    "INSERT INTO shipment_events(shipment_id,status,latitude,longitude) VALUES(@sid,'in_transit',@lat,@lng)",
                    new { sid = sh.ShipmentId, lat = nlat, lng = nlng });

                if (arrived)
                {
                    var failed = _faker.Random.Double() < _opt.DeliveryFailRate;
                    if (failed)
                    {
                        await conn.ExecuteAsync(
                            "INSERT INTO shipment_events(shipment_id,status,latitude,longitude) VALUES(@sid,'failed',@lat,@lng)",
                            new { sid = sh.ShipmentId, lat = nlat, lng = nlng });
                        await conn.ExecuteAsync("UPDATE shipments SET status='cancelled', updated_at=UTC_TIMESTAMP() WHERE id=@id", new { id = sh.ShipmentId });
                    }
                    else
                    {
                        await conn.ExecuteAsync(
                            "INSERT INTO shipment_events(shipment_id,status,latitude,longitude) VALUES(@sid,'delivered',@lat,@lng)",
                            new { sid = sh.ShipmentId, lat = nlat, lng = nlng });
                        await conn.ExecuteAsync("UPDATE shipments SET status='delivered', updated_at=UTC_TIMESTAMP() WHERE id=@id", new { id = sh.ShipmentId });
                    }
                }
            }
        }
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------
    private (decimal lat, decimal lng) MakePseudoDestination(decimal originLat, decimal originLng)
    {
        // Random destination ~5-20 km from origin in a random bearing
        var meters = _faker.Random.Double(5_000, 20_000);
        var bearingDeg = _faker.Random.Double(0, 360);
        var (dlat, dlng) = OffsetMeters((double)originLat, (double)originLng, meters, bearingDeg);
        return ((decimal)dlat, (decimal)dlng);
    }

    private (decimal lat, decimal lng, bool arrived) StepTowards(decimal lat, decimal lng, decimal destLat, decimal destLng, double stepMeters)
    {
        // Compute remaining distance; if less than step, snap to dest
        var dist = HaversineMeters((double)lat, (double)lng, (double)destLat, (double)destLng);
        if (dist <= stepMeters)
            return (destLat, destLng, true);

        // Move one step along bearing
        var brg = BearingDeg((double)lat, (double)lng, (double)destLat, (double)destLng);
        var (nlat, nlng) = OffsetMeters((double)lat, (double)lng, stepMeters, brg);
        return ((decimal)nlat, (decimal)nlng, false);
    }

    private static (double lat, double lng) OffsetMeters(double lat, double lng, double meters, double bearingDeg)
    {
        // Simple great-circle forward calculation
        const double R = 6371000; // Earth radius meters
        var br = bearingDeg * Math.PI / 180.0;
        var φ1 = lat * Math.PI / 180.0;
        var λ1 = lng * Math.PI / 180.0;
        var δ = meters / R;

        var sinφ1 = Math.Sin(φ1);
        var cosφ1 = Math.Cos(φ1);
        var sinδ = Math.Sin(δ);
        var cosδ = Math.Cos(δ);
        var sinBr = Math.Sin(br);
        var cosBr = Math.Cos(br);

        var sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * cosBr;
        var φ2 = Math.Asin(sinφ2);
        var y = sinBr * sinδ * cosφ1;
        var x = cosδ - sinφ1 * sinφ2;
        var λ2 = λ1 + Math.Atan2(y, x);

        var nlat = φ2 * 180.0 / Math.PI;
        var nlng = (λ2 * 180.0 / Math.PI + 540) % 360 - 180; // normalize
        return (nlat, nlng);
    }

    private static double HaversineMeters(double lat1, double lon1, double lat2, double lon2)
    {
        const double R = 6371000; // meters
        var dLat = (lat2 - lat1) * Math.PI / 180.0;
        var dLon = (lon2 - lon1) * Math.PI / 180.0;
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2) +
                Math.Cos(lat1 * Math.PI / 180.0) * Math.Cos(lat2 * Math.PI / 180.0) *
                Math.Sin(dLon / 2) * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return R * c;
    }

    private static double BearingDeg(double lat1, double lon1, double lat2, double lon2)
    {
        var φ1 = lat1 * Math.PI / 180.0;
        var φ2 = lat2 * Math.PI / 180.0;
        var Δλ = (lon2 - lon1) * Math.PI / 180.0;
        var y = Math.Sin(Δλ) * Math.Cos(φ2);
        var x = Math.Cos(φ1) * Math.Sin(φ2) - Math.Sin(φ1) * Math.Cos(φ2) * Math.Cos(Δλ);
        var θ = Math.Atan2(y, x);
        var deg = (θ * 180.0 / Math.PI + 360) % 360;
        return deg;
    }

    // Data carrier for active shipment query
    private class ActiveShipment
    {
        public long ShipmentId { get; set; }
        public long DriverId { get; set; }
        public string ShipStatus { get; set; } = "pending";
        public long VehicleId { get; set; }
        public decimal VehLat { get; set; }
        public decimal VehLng { get; set; }
        public decimal OriginLat { get; set; }
        public decimal OriginLng { get; set; }
        public decimal DestLng { get; set; }
        public decimal DestLat { get; set; }
    }
}
