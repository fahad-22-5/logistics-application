export type Shipment = {
  id: number;
  tracking_number: string;
  origin_warehouse_id: number;
  destination_address: string;
  customer_id: number;
  status: string;
  created_at: string;
};
