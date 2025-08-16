import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="app-container">
      <div className="sidebar">
        <h1 className="logo">Logistics Co.</h1>
        <nav className="nav-menu">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/shipments">Shipments</Link>
          <Link to="/customers">Customers</Link>
          <Link to="/drivers">Drivers</Link>
          <Link to="/warehouses">Warehouses</Link>
        </nav>
        <button className="btn btn-logout" onClick={handleLogout}>Logout</button>
      </div>
      <main className="content">
        {children}
      </main>
    </div>
  );
};

export default Layout;