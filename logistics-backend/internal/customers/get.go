package customers

import (
	"logistics-backend/internal/database"
	"net/http"

	"github.com/gin-gonic/gin"
)

type Customer struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

func GetCustomers(c *gin.Context) {
	role := c.GetString("role")

	// Only managers should be able to view customers
	if role != "manager" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	rows, err := database.DB.Query("SELECT id, name, email FROM users")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch customers",
			"details": err.Error()})
		return
	}
	defer rows.Close()

	var customers []Customer
	for rows.Next() {
		var cust Customer
		if err := rows.Scan(&cust.ID, &cust.Name, &cust.Email); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan customer data"})
			return
		}
		customers = append(customers, cust)
	}

	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Error reading rows"})
		return
	}

	c.JSON(http.StatusOK, customers)
}
