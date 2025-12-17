export type ShipmentMode = "SEA" | "AIR" | "ROAD";
export type ShipmentDirection = "IMPORT" | "EXPORT";
export type Commodity = "FROZEN" | "SPICE" | "BOTH" | "OTHER";

export type SLAStatus = "ON_TIME" | "AT_RISK" | "BREACHED";

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

export type InvoiceStatus = "DRAFT" | "SENT" | "PAID" | "OVERDUE";

export type ShipmentEvent = {
  id: string;
  status: ShipmentStatus | string;
  timestamp: string;
  location?: string;
  description?: string;
  user?: string;
};

export type ShipmentDocument = {
  id: string;
  name: string;
  type: DocType | string;
  status: DocStatus | string;
  uploadDate?: string;
  expiryDate?: string;
  fileUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
};

export type CargoItem = {
  id: string;
  productId: string;
  productName: string;
  hsCode: string;
  quantity: number;
  unit: string;
  weightKg?: number | null;
  tempReq?: string;
  packaging?: string | null;
};

export type Shipment = {
  id: string;
  reference: string;
  masterDoc: string;
  customer: string;

  origin: { code: string; city: string; country: string; contact?: string; portId?: number | null };
  destination: { code: string; city: string; country: string; contact?: string; portId?: number | null };

  mode: ShipmentMode | string;
  direction: ShipmentDirection | string;
  commodity: Commodity | string;
  status: ShipmentStatus | string;
  slaStatus?: SLAStatus | string;

  etd?: string;
  eta?: string;

  incoterm?: { id: number; code: string; name: string; type?: string } | null;
  containerType?: { id: number; code: string; name: string } | null;
  temperature?: { id?: number; setPoint: number; unit: string; range?: string; alerts: number } | null;

  cargo: CargoItem[];
  documents: ShipmentDocument[];
  events: ShipmentEvent[];

  financials: {
    currency: string;
    revenue: number;
    cost: number;
    margin: number;
    invoiceStatus?: InvoiceStatus | string;
  };
};
