package drivers

import (
	"logistics-backend/internal/database"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Driver struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

func GetDrivers(c *gin.Context) {
	role := c.GetString("role")

	// Only managers should be able to view drivers
	if role != "manager" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	rows, err := database.DB.Query("SELECT id, name, email FROM users WHERE role = 'driver'")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch drivers"})
		return
	}
	defer rows.Close()

	var drivers []Driver
	for rows.Next() {
		var d Driver
		if err := rows.Scan(&d.ID, &d.Name, &d.Email); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan driver data"})
			return
		}
		drivers = append(drivers, d)
	}

	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error reading rows"})
		return
	}

	c.JSON(http.StatusOK, drivers)
}
