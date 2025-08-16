import React, { useEffect, useState } from 'react';
import { getWarehouses } from '../services/WarehouseService';
import type { Warehouse } from '../models/Warehouse';
import '../styles/WarehousesPage.css'
const WarehousesPage: React.FC = () => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWarehouses = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await getWarehouses(token);
          setWarehouses(response.data);
        } catch (err) {
          setError('Failed to fetch warehouses');
        }
      }
    };
    fetchWarehouses();
  }, []);

  return (
    <div className="warehouses-page">
      <h2>Warehouses</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          {warehouses.map((warehouse) => (
            <tr key={warehouse.id}>
              <td>{warehouse.id}</td>
              <td>{warehouse.name}</td>
              <td>{warehouse.location}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WarehousesPage;
