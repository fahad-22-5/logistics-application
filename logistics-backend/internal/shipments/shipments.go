package shipments

import (
	"database/sql"
	"log"
	"net/http"
	"time"

	"logistics-backend/internal/database"

	"github.com/gin-gonic/gin"
)

type Shipment struct {
	ID              int64     `json:"id"`
	TrackingNumber  string    `json:"tracking_number"`
	OriginWarehouse int64     `json:"origin_warehouse_id"`
	DestinationAddr string    `json:"destination_address"`
	CustomerID      int64     `json:"customer_id"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
}

func CreateShipment(c *gin.Context) {
	var input struct {
		TrackingNumber  string `json:"tracking_number"`
		OriginWarehouse int64  `json:"origin_warehouse_id"`
		DestinationAddr string `json:"destination_address"`
		CustomerID      int64  `json:"customer_id"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	_, err := database.DB.Exec(`
		INSERT INTO shipments (tracking_number, origin_warehouse_id, destination_address, customer_id, status)
		VALUES (?, ?, ?, ?, 'pending')
	`, input.TrackingNumber, input.OriginWarehouse, input.DestinationAddr, input.CustomerID)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create shipment",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"message": "Shipment created"})
}

func UpdateShipmentStatus(c *gin.Context) {
	userID := c.GetInt("user_id")
	userRole := c.GetString("role")

	id := c.Param("id")

	var body struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate status
	allowedStatuses := []string{"pending", "in_transit", "delivered", "cancelled"}
	isValid := false
	for _, s := range allowedStatuses {
		if body.Status == s {
			isValid = true
			break
		}
	}
	if !isValid {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	// Role check
	if userRole == "customer" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not allowed"})
		return
	}

	// For courier, check if shipment is assigned to them
	if userRole == "driver" {
		var assignedCourierID int
		err := database.DB.QueryRow(`SELECT driver_id FROM shipments WHERE id = ?`, id).Scan(&assignedCourierID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Shipment not found"})
			return
		}
		log.Println("Assigned Driver ID:", assignedCourierID)
		log.Println("User ID:", userID)
		if assignedCourierID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You can only update your own shipments"})
			return
		}
	}

	// Update status
	_, err := database.DB.Exec(`UPDATE shipments SET status = ? WHERE id = ?`, body.Status, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update status",
			"details": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Status updated successfully"})
}

func AssignShipmentToCourier(c *gin.Context) {
	userRole := c.GetString("role")

	// Only managers can assign shipments
	if userRole != "manager" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only managers can assign shipments"})
		return
	}

	id := c.Param("id")

	var body struct {
		DriverId int `json:"driver"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate courier exists
	var exists bool
	err := database.DB.QueryRow(
		`SELECT EXISTS(SELECT 1 FROM users WHERE id = ? AND role = 'driver')`,
		body.DriverId,
	).Scan(&exists)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error", "details": err.Error()})
		return
	}
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid driver ID"})
		return
	}

	// Update the shipment's courier
	res, err := database.DB.Exec(
		`UPDATE shipments SET driver_id = ? WHERE id = ?`,
		body.DriverId, id,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to assign courier", "details": err.Error()})
		return
	}

	rowsAffected, _ := res.RowsAffected()
	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Shipment not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Courier assigned successfully"})
}

func GetShipmentData(c *gin.Context) {
	role := c.GetString("role")
	userID := c.GetInt("user_id")

	id := c.Param("id")

	var rows *sql.Rows
	var err error

	if role == "customer" {
		rows, err = database.DB.Query(`
            SELECT id, tracking_number, origin_warehouse_id, destination_address, customer_id, status
            FROM shipments
            WHERE customer_id = ? and id = ?`, userID, id)
	} else {
		// manager & driver
		rows, err = database.DB.Query(`
            SELECT id, tracking_number, origin_warehouse_id, destination_address, customer_id, status
            FROM shipments WHERE id = ?`, id)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch shipments"})
		return
	}
	defer rows.Close()

	type Shipment struct {
		ID                 int    `json:"id"`
		TrackingNumber     string `json:"tracking_number"`
		OriginWarehouseID  int    `json:"origin_warehouse_id"`
		DestinationAddress string `json:"destination_address"`
		CustomerID         int    `json:"customer_id"`
		Status             string `json:"status"`
	}

	var shipments []Shipment

	for rows.Next() {
		var s Shipment
		if err := rows.Scan(&s.ID, &s.TrackingNumber, &s.OriginWarehouseID, &s.DestinationAddress, &s.CustomerID, &s.Status); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse shipments"})
			return
		}
		shipments = append(shipments, s)
	}

	c.JSON(http.StatusOK, shipments)
}

func GetShipmentCoordinates(c *gin.Context) {
	role := c.GetString("role")

	var rows *sql.Rows
	var err error

	// Adjust query based on role
	if role == "customer" {
		rows, err = database.DB.Query(`
			SELECT shipment_id AS id, tracking_number, lat, lng
			FROM (
				SELECT 
					se.shipment_id,
					s.tracking_number,
					se.latitude AS lat,
					se.longitude AS lng,
					ROW_NUMBER() OVER (PARTITION BY se.shipment_id ORDER BY se.timestamp DESC) AS rn
				FROM shipment_events se
				LEFT JOIN shipments s ON s.id = se.shipment_id
			) t
			WHERE rn = 1
			ORDER BY shipment_id;`)
	} else {
		rows, err = database.DB.Query(`
			SELECT shipment_id AS id, tracking_number, lat, lng
			FROM (
				SELECT 
					se.shipment_id,
					s.tracking_number,
					se.latitude AS lat,
					se.longitude AS lng,
					ROW_NUMBER() OVER (PARTITION BY se.shipment_id ORDER BY se.timestamp DESC) AS rn
				FROM shipment_events se
				LEFT JOIN shipments s ON s.id = se.shipment_id
			) t
			WHERE rn = 1
			ORDER BY shipment_id;`)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch shipment coordinates"})
		return
	}
	defer rows.Close()

	// Response struct
	type ShipmentCoordinate struct {
		ID             int     `json:"id"`
		TrackingNumber string  `json:"tracking_number"`
		Lat            float64 `json:"lat"`
		Lng            float64 `json:"lng"`
	}

	var shipments []ShipmentCoordinate

	for rows.Next() {
		var s ShipmentCoordinate
		if err := rows.Scan(&s.ID, &s.TrackingNumber, &s.Lat, &s.Lng); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse shipment coordinates"})
			return
		}
		shipments = append(shipments, s)
	}

	c.JSON(http.StatusOK, shipments)
}

func GetShipmentCoordinatesByShipmentID(c *gin.Context) {
	role := c.GetString("role")
	id := c.Param("id") // shipment_id from URL

	var rows *sql.Rows
	var err error

	query := `
		SELECT 
			shipment_id AS id, 
			tracking_number, 
			lat, 
			lng, 
			destination_latitude, 
			destination_longitude, 
			warehouse_latitude, 
			warehouse_longitude
		FROM (
			SELECT 
				se.shipment_id,
				s.tracking_number,
				se.latitude AS lat,
				se.longitude AS lng,
				s.destination_latitude, 
				s.destination_longitude,
				w.latitude AS warehouse_latitude,
				w.longitude AS warehouse_longitude,
				ROW_NUMBER() OVER (PARTITION BY se.shipment_id ORDER BY se.timestamp DESC) AS rn
			FROM shipment_events se
			LEFT JOIN shipments s ON s.id = se.shipment_id
			LEFT JOIN warehouses w ON w.id = s.origin_warehouse_id
		) t
		WHERE shipment_id = ? AND rn = 1;
	`

	// Adjust based on role (customers should only see their own shipment)
	if role == "customer" {
		userID := c.GetInt("user_id")
		rows, err = database.DB.Query(query+`
			AND EXISTS (SELECT 1 FROM shipments WHERE id = ? AND customer_id = ?)`,
			id, id, userID)
	} else {
		rows, err = database.DB.Query(query, id)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch shipment coordinates"})
		return
	}
	defer rows.Close()

	// Response struct
	type ShipmentCoordinate struct {
		ID                   int     `json:"id"`
		TrackingNumber       string  `json:"tracking_number"`
		Lat                  float64 `json:"lat"`
		Lng                  float64 `json:"lng"`
		DestinationLatitude  float64 `json:"destination_latitude"`
		DestinationLongitude float64 `json:"destination_longitude"`
		WarehouseLatitude    float64 `json:"warehouse_latitude"`
		WarehouseLongitude   float64 `json:"warehouse_longitude"`
	}

	var shipments []ShipmentCoordinate

	for rows.Next() {
		var s ShipmentCoordinate
		if err := rows.Scan(
			&s.ID,
			&s.TrackingNumber,
			&s.Lat,
			&s.Lng,
			&s.DestinationLatitude,
			&s.DestinationLongitude,
			&s.WarehouseLatitude,
			&s.WarehouseLongitude,
		); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse shipment coordinates"})
			return
		}
		shipments = append(shipments, s)
	}

	c.JSON(http.StatusOK, shipments)
}
