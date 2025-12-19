export type Currency = {
  id: number;
  currencyCode: string; // INR, USD, AED
  name: string;
  exchangeRate: number; // to INR
  createdAt: string;
  updatedAt: string;
};
