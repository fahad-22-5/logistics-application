import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getShipmentById, updateShipmentStatus, getShipmentMapData } from '../services/ShipmentService';
import type { Shipment } from '../models/Shipment';
import '../styles/ShipmentDetailsPage.css';

// Leaflet imports
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom icons
const warehouseIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/69/69524.png', // house icon
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -30],
});

const currentIcon = new L.Icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/3097/3097144.png", // car icon
  iconSize: [30, 30],
  iconAnchor: [15, 30],
  popupAnchor: [0, -25],
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // red marker
  iconSize: [35, 35],
  iconAnchor: [17, 35],
  popupAnchor: [0, -30],
});

// Component to fit map bounds to markers
const FitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  if (points.length > 0) {
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [50, 50] });
  }
  return null;
};

const ShipmentDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [mapData, setMapData] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState('');

  // Fetch shipment details once
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
  }, [id]);

  // Fetch and refresh map data every 3 seconds
  useEffect(() => {
    const fetchMapData = async () => {
      const token = localStorage.getItem('token');
      if (token && id) {
        try {
          const mapResponse = await getShipmentMapData(token, id);
          setMapData(mapResponse.data[0]);
        } catch (err) {
          setError('Failed to fetch map data');
        }
      }
    };

    fetchMapData();
    const interval = setInterval(fetchMapData, 3000);
    return () => clearInterval(interval);
  }, [id]);

  // Handle status update
  const handleUpdateStatus = async () => {
    const token = localStorage.getItem('token');
    if (token && id) {
      try {
        await updateShipmentStatus(token, id, newStatus);

        // Refresh shipment details
        const response = await getShipmentById(token, id);
        setShipment(response.data[0]);

        // Refresh map data
        const mapResponse = await getShipmentMapData(token, id);
        setMapData(mapResponse.data[0]);

        setNewStatus('');
      } catch (err) {
        setError('Failed to update status');
      }
    }
  };

  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!shipment || !mapData) return <div>Loading...</div>;

  // Points for auto-fitting map
  const markerPositions: [number, number][] = [
    [mapData.warehouse_latitude, mapData.warehouse_longitude],
    [mapData.lat, mapData.lng],
    [mapData.destination_latitude, mapData.destination_longitude],
  ];

  return (
    <div className="shipment-details-container">
      <h2>Shipment Details</h2>
      <p><strong>ID:</strong> {shipment.id}</p>
      <p><strong>Tracking Number:</strong> {shipment.tracking_number}</p>
      <p><strong>Status:</strong> {shipment.status}</p>
      <p><strong>Origin Warehouse ID:</strong> {shipment.origin_warehouse_id}</p>
      <p><strong>Destination Address:</strong> {shipment.destination_address}</p>
      <p><strong>Customer ID:</strong> {shipment.customer_id}</p>
      <p><strong>Created At:</strong> {shipment.created_at}</p>

      <div className="update-status-section">
        <h3>Update Status</h3>
        <input
          type="text"
          className="update-status-input"
          value={newStatus}
          onChange={(e) => setNewStatus(e.target.value)}
          placeholder="Enter new status"
        />
        <button className="update-status-btn" onClick={handleUpdateStatus}>
          Update
        </button>
      </div>

      <div className="shipment-map" style={{ height: '400px', marginTop: '20px' }}>
        <MapContainer
          center={[mapData.lat, mapData.lng]}
          zoom={6}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          <Marker position={[mapData.warehouse_latitude, mapData.warehouse_longitude]} icon={warehouseIcon}>
            <Popup>Warehouse / Origin</Popup>
          </Marker>

          <Marker position={[mapData.lat, mapData.lng]} icon={currentIcon}>
            <Popup>Current Location</Popup>
          </Marker>

          <Marker position={[mapData.destination_latitude, mapData.destination_longitude]} icon={destinationIcon}>
            <Popup>Destination</Popup>
          </Marker>

          <Polyline
            positions={markerPositions}
            color="blue"
          />

          <FitBounds points={markerPositions} />
        </MapContainer>
      </div>
    </div>
  );
};

export default ShipmentDetailsPage;
