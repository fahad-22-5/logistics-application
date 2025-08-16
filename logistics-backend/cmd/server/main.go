package main

import (
	"logistics-backend/internal/auth"
	"logistics-backend/internal/config"
	"logistics-backend/internal/customers"
	"logistics-backend/internal/database"
	"logistics-backend/internal/drivers"
	"logistics-backend/internal/middleware"
	"logistics-backend/internal/shipments"
	"logistics-backend/internal/warehouses"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	config.LoadConfig()
	database.Connect()

	r := gin.Default()

	// CORS middleware
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{
		"http://localhost:5173",
		"http://192.168.1.14:5173",
	}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Authorization"}
	r.Use(cors.New(config))

	// Public routes
	r.POST("/auth/register", auth.Register)
	r.POST("/auth/login", auth.Login)

	// Protected routes
	api := r.Group("/api")
	{
		api.POST("/shipments", middleware.AuthMiddleware("manager"), shipments.CreateShipment)
		api.GET("/shipments", middleware.AuthMiddleware("customer", "manager", "driver"), shipments.GetShipments)
		api.GET("/getWarehouses", middleware.AuthMiddleware("manager", "driver"), warehouses.GetWarehouses)
		api.GET("/getDrivers", middleware.AuthMiddleware("manager"), drivers.GetDrivers)
		api.GET("/getCustomers", middleware.AuthMiddleware("manager"), customers.GetCustomers)
		api.PUT("/shipments/:id/status", middleware.AuthMiddleware("manager", "driver"), shipments.UpdateShipmentStatus)
		api.PUT("/shipments/:id/assign", middleware.AuthMiddleware("manager"), shipments.AssignShipmentToCourier)
		api.GET("/me", middleware.AuthMiddleware(), auth.GetUserDetails)
		api.GET("/getShipments/:id", middleware.AuthMiddleware("customer", "manager", "driver"), shipments.GetShipmentData)
		api.GET("/getShipmentCoordinates", middleware.AuthMiddleware("customer", "manager", "driver"), shipments.GetShipmentCoordinates)
		api.GET("/getShipmentCoordinatesById/:id", middleware.AuthMiddleware("customer", "manager", "driver"), shipments.GetShipmentCoordinatesByShipmentID)
	}

	// for _, ri := range r.Routes() {
	// 	println(ri.Method, ri.Path)
	// }

	r.Run(":8080")
}
