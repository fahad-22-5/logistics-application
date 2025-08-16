import React, { useEffect, useState } from 'react';
import { getShipments, createShipment } from '../services/ShipmentService';
import type { Shipment } from '../models/Shipment';
import { Link } from 'react-router-dom';

const ShipmentsPage: React.FC = () => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [error, setError] = useState<string | null>(null);

  // State for the create shipment form
  const [trackingNumber, setTrackingNumber] = useState('');
  const [originWarehouse, setOriginWarehouse] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [customerId, setCustomerId] = useState('');

  useEffect(() => {
    const fetchShipments = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await getShipments(token);
          setShipments(response.data);
        } catch (err) {
          setError('Failed to fetch shipments');
        }
      }
    };
    fetchShipments();
  }, []);

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (token) {
      try {
        await createShipment(token, { 
          tracking_number: trackingNumber, 
          origin_warehouse_id: parseInt(originWarehouse),
          destination_address: destinationAddress,
          customer_id: parseInt(customerId)
        });
        // Refresh the shipments list
        const response = await getShipments(token);
        setShipments(response.data);
        // Clear the form
        setTrackingNumber('');
        setOriginWarehouse('');
        setDestinationAddress('');
        setCustomerId('');
      } catch (err) {
        setError('Failed to create shipment');
      }
    }
  };

  return (
    <div>
      <h2>Shipments</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      <h3>Create Shipment</h3>
      <form onSubmit={handleCreateShipment}>
        <div className="mb-3">
          <label className="form-label">Tracking Number</label>
          <input type="text" className="form-control" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">Origin Warehouse ID</label>
          <input type="text" className="form-control" value={originWarehouse} onChange={(e) => setOriginWarehouse(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">Destination Address</label>
          <input type="text" className="form-control" value={destinationAddress} onChange={(e) => setDestinationAddress(e.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label">Customer ID</label>
          <input type="text" className="form-control" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
        </div>
        <button type="submit" className="comic-button">Create</button>
      </form>

      <h3 className="mt-4">Shipments List</h3>
      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tracking Number</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {shipments.map((shipment) => (
            <tr key={shipment.id}>
              <td>{shipment.id}</td>
              <td>{shipment.tracking_number}</td>
              <td>{shipment.status}</td>
              <td>
                <Link to={`/shipments/${shipment.id}`} className="btn btn-sm btn-primary">View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ShipmentsPage;
