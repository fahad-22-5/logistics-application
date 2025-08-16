import api from './api';

export const getDrivers = (token: string) => {
  return api.get('/api/getDrivers', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
