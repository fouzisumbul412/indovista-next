import type { TransportMode } from "./transport";

export type { TransportMode };

export type VehicleOwnership = "OWN" | "RENT";
export type FuelType = "PETROL" | "DIESEL" | "CNG" | "LPG" | "ELECTRIC" | "OTHER";

export type DriverMini = {
  id: string;
  name: string;
  contactNumber?: string | null;
  licenseNumber?: string | null;
  transportMode: TransportMode;
};

export type Vehicle = {
  id: string;
  name: string;
  number: string;
  ownership: VehicleOwnership;

  engineType?: string | null;
  fuel: FuelType;
  fuelOther?: string | null;
  fuelCapacity?: number | null;
  loadingCapacity?: number | null;

  rcNumber?: string | null;
  rcExpiry?: Date | null;
  pollutionExpiry?: Date | null;

  isRegistered: boolean;
  registeredAt?: Date | null;

  docs?: string | null;
  transportMode: TransportMode;

  managingVehicle?: string | null;
  medicalSupport?: string | null;
  notes?: string | null;

  assignedDrivers?: DriverMini[];
  createdAt?: Date;
  updatedAt?: Date;
};
