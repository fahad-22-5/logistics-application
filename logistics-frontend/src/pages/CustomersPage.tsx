import React, { useEffect, useState } from 'react';
import { getCustomers } from '../services/CustomerService';
import type { Customer } from '../models/Customer';

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomers = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await getCustomers(token);
          setCustomers(response.data);
        } catch (err) {
          setError('Failed to fetch customers');
        }
      }
    };
    fetchCustomers();
  }, []);

  return (
    <div>
      <h2>Customers</h2>
      {error && <div className="alert alert-danger">{error}</div>}

      <table className="table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id}>
              <td>{customer.id}</td>
              <td>{customer.name}</td>
              <td>{customer.email}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CustomersPage;
