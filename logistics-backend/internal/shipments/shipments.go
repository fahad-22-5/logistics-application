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
