import api from './api';

export const getWarehouses = (token: string) => {
  return api.get('/api/getWarehouses', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
