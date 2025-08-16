import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { User } from '../models/User';
import { getMe } from '../services/AuthService';

const DashboardPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await getMe(token);
          setUser(response.data);
        } catch (error) {
          console.error('Error fetching user:', error);
          localStorage.removeItem('token');
          navigate('/login');
        }
      } else {
        navigate('/login');
      }
    };
    fetchUser();
  }, [navigate]);

  if (!user) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div>
      <h2>Dashboard</h2>
      <p>Welcome, {user.name}!</p>
      <p>Your role is: {user.role}</p>

      {user.role === 'manager' && (
        <div className="mt-4">
          <h3>Manager Actions</h3>
          <ul className="list-group">
            <li className="list-group-item"><Link to="/shipments">Manage Shipments</Link></li>
            <li className="list-group-item"><Link to="/customers">View Customers</Link></li>
            <li className="list-group-item"><Link to="/drivers">View Drivers</Link></li>
            <li className="list-group-item"><Link to="/warehouses">View Warehouses</Link></li>
          </ul>
        </div>
      )}

      {user.role === 'driver' && (
        <div className="mt-4">
          <h3>Driver Actions</h3>
          <ul className="list-group">
            <li className="list-group-item"><Link to="/shipments">View Assigned Shipments</Link></li>
            <li className="list-group-item"><Link to="/warehouses">View Warehouses</Link></li>
          </ul>
        </div>
      )}

      {user.role === 'customer' && (
        <div className="mt-4">
          <h3>Customer Actions</h3>
          <ul className="list-group">
            <li className="list-group-item"><Link to="/shipments">View My Shipments</Link></li>
          </ul>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
