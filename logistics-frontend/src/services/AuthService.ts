import api from './api';

export const register = (userData: any) => {
  return api.post('/auth/register', userData);
};

export const login = (credentials: any) => {
  return api.post('/auth/login', credentials);
};

export const getMe = (token: string) => {
  return api.get('/api/me', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
};
