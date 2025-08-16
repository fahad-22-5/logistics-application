import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { User } from '../models/User';
import { getMe } from '../services/AuthService';
import '../styles/DashboardStyle.css';

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

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  if (!user) {
    return <div>Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-page">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-left">
          <Link to="/" className="logo">🚚 Logistics Co.</Link>
        </div>
        <div className="navbar-right">
          <span className="user-info">Hi, {user.name}</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>

      {/* Dashboard Content */}
      <div className="dashboard-container">
        <h2>Dashboard</h2>
        <p>Welcome, {user.name}!</p>
        <p>Your role is: {user.role}</p>

        {user.role === 'manager' && (
          <div className="actions-section">
            <h3>Manager Actions</h3>
            <div className="actions-grid">
              <div className="action-card"><Link to="/shipments">Manage Shipments</Link></div>
              <div className="action-card"><Link to="/customers">View Customers</Link></div>
              <div className="action-card"><Link to="/drivers">View Drivers</Link></div>
              <div className="action-card"><Link to="/warehouses">View Warehouses</Link></div>
            </div>
          </div>
        )}

        {user.role === 'driver' && (
          <div className="actions-section">
            <h3>Driver Actions</h3>
            <div className="actions-grid">
              <div className="action-card"><Link to="/shipments">View Assigned Shipments</Link></div>
              <div className="action-card"><Link to="/warehouses">View Warehouses</Link></div>
            </div>
          </div>
        )}

        {user.role === 'customer' && (
          <div className="actions-section">
            <h3>Customer Actions</h3>
            <div className="actions-grid">
              <div className="action-card"><Link to="/shipments">View My Shipments</Link></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
