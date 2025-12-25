// app/(dashboard)/shipments/types.ts

export type ShipmentMode = "SEA" | "AIR" | "ROAD";
export type ShipmentDirection = "IMPORT" | "EXPORT";
export type Commodity = "FROZEN" | "SPICE" | "BOTH" | "OTHER";

export type SLAStatus = "ON_TIME" | "AT_RISK" | "BREACHED";
export type Mode = "SEA" | "AIR" | "ROAD";
export type Direction = "IMPORT" | "EXPORT";



export type ShipmentStatus =
  | "BOOKED"
  | "PICKED_UP"
  | "IN_TRANSIT_ORIGIN"
  | "AT_PORT_ORIGIN"
  | "CUSTOMS_EXPORT"
  | "ON_VESSEL"
  | "AT_PORT_DEST"
  | "CUSTOMS_IMPORT"
  | "DELIVERED"
  | "EXCEPTION";

export type DocType =
  | "INVOICE"
  | "PACKING_LIST"
  | "BILL_LADING"
  | "HEALTH_CERT"
  | "ORIGIN_CERT"
  | "CUSTOMS_DEC"
  | "INSURANCE"
  | "OTHER";

export type DocStatus =
  | "MISSING"
  | "DRAFT"
  | "SUBMITTED"
  | "APPROVED"
  | "REJECTED"
  | "FINAL"
  | "PENDING"
  | "NOT_RECEIVED";

export type DriverMini = {
  id: string;
  name: string;
  contactNumber?: string | null;
  role?: string | null;
  transportMode?: Mode;
};

export type VehicleMini = {
  id: string;
  name: string;
  number: string;
  transportMode: Mode;
  assignedDrivers: DriverMini[];
};  

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE";

/** List page row (what /api/shipments returns for the table) */
export type ShipmentRow = {
  id: string;
  reference: string;
  masterDoc: string;
  customer: string;
  origin: { code: string; city: string; country: string };
  destination: { code: string; city: string; country: string };
  mode: ShipmentMode;
  direction: ShipmentDirection;
  commodity: Commodity;
  status: string;
  slaStatus: SLAStatus;
  eta: string;
};

/** Detail page types (what /api/shipments/:id returns) */
export type ShipmentEvent = {
  id: string;
  status: ShipmentStatus;
  timestamp: string; // ISO string recommended
  location?: string | null;
  description?: string | null;
  user?: string | null;
};

export type ShipmentDocument = {
  id: string;
  name: string;
  type: DocType;
  status: DocStatus;
  uploadDate?: string | null; // e.g. "2025-12-18"
  expiryDate?: string | null; // "YYYY-MM-DD"
  fileUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null; // bytes
};

export type CargoItem = {
  id: string;
  productId: string;
  productName: string;
  hsCode?: string | null;
  quantity: number;
  unit: string;
  weightKg?: number | null;
  tempReq?: string | null;
  packaging?: string | null;
};

export type Incoterm = { id: number; code: string; name: string };

export type ContainerType = { id: number; code: string; name: string };

export type TemperaturePreset = {
  id: number;
  name: string;
  // your UI uses setPoint/unit/range — keep them optional so it works even if API returns only some fields
  setPoint?: number | null;
  unit?: string | null; // "C" | "F" etc
  range?: string | null;
  tolerance?: string | null;
};

export type ShipmentParty = {
  code: string; // port code shown in UI (MAA, DXB, etc.)
  city: string;
  country: string;
  contact?: string | null;
  portId?: number | null;
};

export type ShipmentFinancials = {
  currency: string;
  revenue: number;
  cost: number;
  margin: number;
  invoiceStatus: InvoiceStatus | string; // keep string-safe until backend is strict
};

export type Shipment = {
  id: string;
  reference: string;
  masterDoc?: string | null;

  customer: string;
  customerId?: string | null;

  direction: ShipmentDirection;
  mode: ShipmentMode;
  commodity: Commodity;

  status: ShipmentStatus | string;
  slaStatus: SLAStatus;

  etd?: string | null; // "YYYY-MM-DD"
  eta?: string | null; // "YYYY-MM-DD"

  origin: ShipmentParty;
  destination: ShipmentParty;

  incoterm?: Incoterm | null;
  containerType?: ContainerType | null;
  temperature?: TemperaturePreset | null;
  vehicle?: VehicleMini | null;

  cargo: CargoItem[];
  documents: ShipmentDocument[];
  events: ShipmentEvent[];

  financials: ShipmentFinancials;
  payments: Payment[]; // Added
  invoices?: Array<{
    id: string;
    invoiceNumber: string;
    amount: number;
    currency: string;
    status: string;
  }>;

  createdAt?: string;
  updatedAt?: string;
};
export type Payment = {
  id: string;
  amount: number;
  currency: string;
  method: "UPI" | "CASH" | "ACCOUNT" | "CHEQUE" | "OTHER";
  transactionNum?: string | null;
  date: string; // YYYY-MM-DD
  notes?: string | null;
  status: "PENDING" | "COMPLETED" | "FAILED";
};
interface ShipmentMini {
  id: string;
  reference: string;
  customer: string;
}

interface AddDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (doc: ShipmentDocument) => void;
  shipments: ShipmentMini[]; // ✅ real data
}
