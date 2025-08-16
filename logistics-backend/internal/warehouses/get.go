package warehouses

import (
	"logistics-backend/internal/database"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Warehouse struct {
	ID        int    `json:"id"`
	Name      string `json:"name"`
	Latitude  string `json:"latitude"`
	Longitude string `json:"longitude"`
}

func GetWarehouses(c *gin.Context) {
	role := c.GetString("role")

	// Only manager & driver can access
	if role != "manager" && role != "driver" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	rows, err := database.DB.Query("SELECT id, name, latitude, longitude FROM warehouses")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch warehouses"})
		return
	}
	defer rows.Close()

	var warehouses []Warehouse
	for rows.Next() {
		var w Warehouse
		if err := rows.Scan(&w.ID, &w.Name, &w.Latitude, &w.Longitude); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan data"})
			return
		}
		warehouses = append(warehouses, w)
	}

	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error reading rows"})
		return
	}

	c.JSON(http.StatusOK, warehouses)
}
