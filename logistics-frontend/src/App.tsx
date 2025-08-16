import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import './App.css'; 

import ShipmentsPage from './pages/ShipmentsPage';
import ShipmentDetailsPage from './pages/ShipmentDetailsPage';
import CustomersPage from './pages/CustomersPage';
import DriversPage from './pages/DriversPage';
import WarehousesPage from './pages/WarehousesPage';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/*"
          element={<PrivateRoute><Layout><MainApp /></Layout></PrivateRoute>}
        />
      </Routes>
    </Router>
  );
};

const MainApp: React.FC = () => {
  return (
    <Routes>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/shipments" element={<ShipmentsPage />} />
      <Route path="/shipments/:id" element={<ShipmentDetailsPage />} />
      <Route path="/customers" element={<CustomersPage />} />
      <Route path="/drivers" element={<DriversPage />} />
      <Route path="/warehouses" element={<WarehousesPage />} />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
};

export default App;