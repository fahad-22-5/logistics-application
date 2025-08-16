import api from './api';

export const getShipments = (token: string) => {
  return api.get('/api/shipments', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const getShipmentLocation = (token: string) => {
  return api.get('/api/getShipmentCoordinates', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const getShipmentMapData = (token: string, id: string) => {
  return api.get(`/api/getShipmentCoordinatesById/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

export const createShipment = (token: string, shipmentData: any) => {
  return api.post('/api/shipments', shipmentData, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};

export const getShipmentById = (token: string, id: string) => {
  return api.get(`/api/getShipments/${id}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
};

export const updateShipmentStatus = (token: string, id: string, status: string) => {
  return api.put(`/api/shipments/${id}/status`, { status }, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
