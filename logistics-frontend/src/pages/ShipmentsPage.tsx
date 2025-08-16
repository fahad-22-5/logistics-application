import React, { useEffect, useState } from 'react';
import { getShipments, createShipment, getShipmentLocation } from '../services/ShipmentService';
import type { Shipment } from '../models/Shipment';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import '../styles/ShipmentsStyle.css';

const ShipmentsPage: React.FC = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [trackingNumber, setTrackingNumber] = useState('');
  const [originWarehouse, setOriginWarehouse] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [customerId, setCustomerId] = useState('');

  // Fetch shipments once
  useEffect(() => {
    const fetchShipments = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await getShipments(token);
          setShipments(response.data);
        } catch (err) {
          setError('Failed to fetch shipments');
        }
      }
    };
    fetchShipments();
  }, []);

  // Fetch live locations every 3 seconds
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const fetchLocations = async () => {
      try {
        const response = await getShipmentLocation(token);
        setLocations(response.data);
      } catch (err) {
        console.error("Failed to fetch locations", err);
      }
    };

    fetchLocations();
    const interval = setInterval(fetchLocations, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await createShipment(token, {
          tracking_number: trackingNumber,
          origin_warehouse_id: parseInt(originWarehouse),
          destination_address: destinationAddress,
          customer_id: parseInt(customerId),
        });
        // Refresh shipments
        const response = await getShipments(token);
        setShipments(response.data);
        // Reset form
        setTrackingNumber('');
        setOriginWarehouse('');
        setDestinationAddress('');
        setCustomerId('');
      } catch (err) {
        setError('Failed to create shipment');
      }
    }
  };

  // Custom icon for markers
  const shipmentIcon = new L.Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/3097/3097144.png",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });

  // Component to auto-fit map to markers
  const FitBounds = ({ points }: { points: [number, number][] }) => {
    const map = useMap();
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
    return null;
  };

  const markerPositions: [number, number][] = locations.map(loc => [loc.lat, loc.lng]);

  return (
    <div className="shipments-container">
      <h2 className="page-title">📦 Shipments</h2>
      {error && <div className="error-message">{error}</div>}

      {/* Create shipment form */}
      <div className="card">
        <h3>Create Shipment</h3>
        <form onSubmit={handleCreateShipment} className="shipment-form">
          <input type="text" placeholder="Tracking Number"
            value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
          <input type="text" placeholder="Origin Warehouse ID"
            value={originWarehouse} onChange={(e) => setOriginWarehouse(e.target.value)} />
          <input type="text" placeholder="Destination Address"
            value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} />
          <input type="text" placeholder="Customer ID"
            value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
          <button type="submit" className="comic-button">Create</button>
        </form>
      </div>
      
      {/* Map section */}
      <div className="card mt-4">
        <h3>Live Shipment Tracking</h3>
        <MapContainer
          center={[28.7041, 77.1025]} // Default: Delhi
          zoom={5}
          style={{ height: "500px", width: "100%", borderRadius: "12px" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          {locations.map((loc) => (
            <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={shipmentIcon}>
              <Popup>
                <b>{loc.tracking_number}</b><br />
                Lat: {loc.lat}, Lng: {loc.lng}
              </Popup>
            </Marker>
          ))}
          <FitBounds points={markerPositions} />
        </MapContainer>
      </div>

      {/* Shipments list */}
      <div className="card mt-4">
        <h3>Shipments List</h3>
        <table className="styled-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Tracking Number</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {shipments.map((shipment) => (
              <tr key={shipment.id}>
                <td>{shipment.id}</td>
                <td>{shipment.tracking_number}</td>
                <td>
                  <span className={`status-badge ${shipment.status}`}>
                    {shipment.status}
                  </span>
                </td>
                <td>
                  <Link to={`/shipments/${shipment.id}`} className="view-button">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ShipmentsPage;
