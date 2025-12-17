export type TransportMode = "ROAD" | "SEA" | "AIR";
export type DriverRole = "DRIVER" | "OPERATOR";

export type VehicleMini = {
  id: string;
  name: string;
  number: string;
  transportMode: TransportMode;
};

export type Driver = {
  id: string;
  name: string;
  age?: number | null;
  role: DriverRole;

  profession?: string | null;
  education?: string | null;
  languages?: string | null;
  licenseNumber?: string | null;
  contactNumber?: string | null;
  email?: string | null;
  address?: string | null;

  transportMode: TransportMode;
  medicalCondition?: string | null;
  notes?: string | null;

  assignedVehicles?: VehicleMini[];
  createdAt?: string;
  updatedAt?: string;
};
