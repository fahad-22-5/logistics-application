import React, { useEffect, useState } from 'react';
import { getDrivers } from '../services/DriverService';
import type { Driver } from '../models/Driver';

const DriversPage: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDrivers = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await getDrivers(token);
          setDrivers(response.data);
        } catch (err) {
          setError('Failed to fetch drivers');
        }
      }
    };
    fetchDrivers();
  }, []);

  return (
    <div>
      <h2>Drivers</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.id}>
              <td>{driver.id}</td>
              <td>{driver.name}</td>
              <td>{driver.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DriversPage;
