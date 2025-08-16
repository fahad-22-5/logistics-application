import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getShipmentById, updateShipmentStatus } from '../services/ShipmentService';
import type { Shipment } from '../models/Shipment';

const ShipmentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');

  useEffect(() => {
    const fetchShipment = async () => {
      const token = localStorage.getItem('token');
      if (token && id) {
        try {
          const response = await getShipmentById(token, id);
          setShipment(response.data[0]);
        } catch (err) {
          setError('Failed to fetch shipment');
        }
      }
    };
    fetchShipment();
    //console.log(shipment);
  }, [id]);

  const handleUpdateStatus = async () => {
    const token = localStorage.getItem('token');
    if (token && id) {
      try {
        await updateShipmentStatus(token, id, newStatus);
        // Refresh the shipment details
        const response = await getShipmentById(token, id);
        setShipment(response.data[0]);
        setNewStatus('');
      } catch (err) {
        setError('Failed to update status');
      }
    }
  };

  if (error) {
    return <div className="alert alert-danger">{error}</div>;
  }

  if (!shipment) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Shipment Details</h2>
      <p><strong>ID:</strong> {shipment.id}</p>
      <p><strong>Tracking Number:</strong> {shipment.tracking_number}</p>
      <p><strong>Status:</strong> {shipment.status}</p>
      <p><strong>Origin Warehouse ID:</strong> {shipment.origin_warehouse_id}</p>
      <p><strong>Destination Address:</strong> {shipment.destination_address}</p>
      <p><strong>Customer ID:</strong> {shipment.customer_id}</p>
      <p><strong>Created At:</strong> {shipment.created_at}</p>

      <div className="mt-4">
        <h3>Update Status</h3>
        <div className="input-group mb-3">
          <input 
            type="text" 
            className="form-control" 
            value={newStatus} 
            onChange={(e) => setNewStatus(e.target.value)} 
            placeholder="Enter new status"
          />
          <button className="btn btn-primary" onClick={handleUpdateStatus}>Update</button>
        </div>
      </div>
    </div>
  );
};

export default ShipmentDetailsPage;
