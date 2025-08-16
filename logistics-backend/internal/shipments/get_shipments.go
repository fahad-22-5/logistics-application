package shipments

import (
	"database/sql"
	"net/http"

	"logistics-backend/internal/database"

	"github.com/gin-gonic/gin"
)

func GetShipments(c *gin.Context) {
	role := c.GetString("role")
	userID := c.GetInt("user_id")

	var rows *sql.Rows
	var err error

	if role == "customer" {
		rows, err = database.DB.Query(`
            SELECT id, tracking_number, origin_warehouse_id, destination_address, customer_id, status
            FROM shipments
            WHERE customer_id = ?`, userID)
	} else {
		// manager & driver
		rows, err = database.DB.Query(`
            SELECT id, tracking_number, origin_warehouse_id, destination_address, customer_id, status
            FROM shipments`)
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
