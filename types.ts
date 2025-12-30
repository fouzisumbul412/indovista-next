
export type Mode = 'SEA' | 'AIR' | 'ROAD';
export type Direction = 'IMPORT' | 'EXPORT';
export type CommodityType = 'FROZEN' | 'SPICE' | 'DRY';
export type Status = 
  | 'BOOKED' 
  | 'PICKED_UP' 
  | 'IN_TRANSIT_ORIGIN' 
  | 'AT_PORT_ORIGIN' 
  | 'CUSTOMS_EXPORT' 
  | 'ON_VESSEL' 
  | 'AT_PORT_DEST' 
  | 'CUSTOMS_IMPORT' 
  | 'DELIVERED' 
  | 'EXCEPTION';

export interface ShipmentEvent {
  id: string;
  status: string;
  timestamp: string;
  location: string;
  description: string;
  user: string;
}

export type DocumentStatus = 'MISSING' | 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'FINAL' | 'PENDING' | 'NOT_RECEIVED';

export interface Document {
  id: string;
  name: string;
  type: 'INVOICE' | 'PACKING_LIST' | 'BILL_LADING' | 'HEALTH_CERT' | 'ORIGIN_CERT' | 'CUSTOMS_DEC' | 'INSURANCE' | 'OTHER';
  status: DocumentStatus;
  uploadedAt?: Date;
  expiryDate?: Date | null;
  fileUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  shipmentId: string;
  shipment?: {
    id: string;
    reference: string;
    customer: {
      companyName: string;
    };
  };
}

export interface CargoItem {
  id: string;
  productName: string;
  hsCode: string;
  quantity: number;
  unit: string;
  weightKg: number;
  tempReq: string;
  packaging: string;
}

export interface Shipment {
  id: string;
  reference: string;
  masterDoc: string;
  customer: string;
  customerId?: string;
  origin: {
    code: string;
    city: string;
    country: string;
  };
  destination: {
    code: string;
    city: string;
    country: string;
  };
  mode: Mode;
  direction: Direction;
  commodity: CommodityType;
  status: Status;
  slaStatus: 'ON_TIME' | 'AT_RISK' | 'BREACHED';
  etd: string;
  eta: string;
  temperature: {
    setPoint: number;
    unit: 'C' | 'F';
    range: string;
    alerts: number;
  };
  events: ShipmentEvent[];
  documents: Document[];
  cargo: CargoItem[];
  financials: {
    currency: string;
    revenue: number;
    cost: number;
    margin: number;
    invoiceStatus: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';
  };
}

export interface Metric {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  color?: 'blue' | 'green' | 'red' | 'orange';
}

export type CustomerType = 'Importer' | 'Distributor' | 'RetailChain' | 'RestaurantGroup';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface Customer {
  id: string;                    // Prisma cuid()
  customerCode: string;          // CUST-001 etc
  companyName: string;           // replaces name
  type: CustomerType;

  contactPerson: string;
  phone: string | null;
  email: string;

  address: string | null;
  city: string | null;
  country: string;

  currency: string;
  creditLimit: number;
  usedCredits: number;
  totalAmount: number;

  paymentTerms: string | null;
  kycStatus: boolean;
  sanctionsCheck: boolean;
  status: CustomerStatus;
  createdAt: Date;
  updatedAt: Date;
}


export interface Product {
  id: string;
  name: string;
  category: string;
  type: 'FROZEN' | 'SPICE';
  hsCode: string;
  temperature: string;
  packSize: string;
  shelfLife: string;
  unitsPerCarton?: number;
  cartonsPerPallet?: number;
  notes?: string;
}

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';

export interface Quote {
  id: string;
  reference: string;
  customer: string;
  origin: { city: string; country: string };
  destination: { city: string; country: string };
  mode: Mode;
  commodity: CommodityType;
  estValue: number;
  currency: string;
  validTill: string;
  status: QuoteStatus;
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE';

export interface InvoiceLineItem {
  id: string;
  description: string;
  hsnCode?: string;
  quantity: number;
  rate: number;
  taxableValue?: number;
  taxRate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerGstin?: string;
  placeOfSupply?: string;
  paidAmount: number;
  balanceAmount: number;
  shipmentId: string;
  shipmentRef: string;
  issueDate: string;
  dueDate: string;
  subtotal?: number;
  totalTax?: number;
  tdsRate?: number;
  tdsAmount?: number;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  items?: InvoiceLineItem[];
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityRef: string;
  entityType: string;
  role: string;
  description: string;
  user: string;
  timestamp: string;
  iconType: 'user' | 'document' | 'alert' | 'invoice' | 'check';
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Operations' | 'Finance' | 'Documentation' | 'Sales' | 'Read Only';
  status: 'Active' | 'Inactive';
  lastLogin: string;
}

export type ComplianceTaskType = 'KYC_REVIEW' | 'SANCTIONS_CHECK' | 'DOC_VALIDATION';
export type ComplianceTaskStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ComplianceTask {
    id: string;
    type: ComplianceTaskType;
    entityName: string; // Customer Name or Shipment Ref
    entityId: string;
    description: string;
    status: ComplianceTaskStatus;
    assignedTo?: string;
    dueDate: string;
    createdDate: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
}
