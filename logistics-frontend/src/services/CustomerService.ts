import api from './api';

export const getCustomers = (token: string) => {
  return api.get('/api/getCustomers', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
