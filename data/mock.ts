
import { Shipment, Metric, Customer, Product, Document, Quote, Invoice, AuditLogEntry, SystemUser, ComplianceTask } from '../types';

export const KPIS: Metric[] = [
  { label: 'Active Shipments', value: 142, change: '+5%', trend: 'up', color: 'blue' },
  { label: 'In Customs (Global)', value: 18, change: '-2', trend: 'down', color: 'orange' },
  { label: 'Avg Clearance Time', value: '26h', change: '-4h', trend: 'down', color: 'green' }, // Down is good for time
  { label: 'Revenue (MTD)', value: '₹10.2Cr', change: '+12%', trend: 'up', color: 'green' },
];

// export const MOCK_CUSTOMERS: Customer[] = [
//   {
//     id: 'CUST-001',
//     name: 'Nordic Foods AS',
//     type: 'Distributor',
//     country: 'Norway',
//     city: 'Oslo',
//     contactPerson: 'Erik Hansen',
//     email: 'erik@nordicfoods.no',
//     currency: 'INR',
//     creditLimit: 40000000,
//     paymentTerms: 'Net 30',
//     kycStatus: true,
//     sanctionsCheck: true
//   },
//   {
//     id: 'CUST-002',
//     name: 'Spice World GmbH',
//     type: 'Importer',
//     country: 'Germany',
//     city: 'Hamburg',
//     contactPerson: 'Hans Mueller',
//     email: 'h.mueller@spiceworld.de',
//     currency: 'INR',
//     creditLimit: 25000000,
//     paymentTerms: 'Net 45',
//     kycStatus: true,
//     sanctionsCheck: true
//   },
//   {
//     id: 'CUST-003',
//     name: 'Fresh Mart LLC',
//     type: 'Retail Chain',
//     country: 'UAE',
//     city: 'Dubai',
//     contactPerson: 'Ahmed Al-Rashid',
//     email: 'procurement@freshmart.ae',
//     currency: 'INR',
//     creditLimit: 15000000,
//     paymentTerms: 'Net 15',
//     kycStatus: true,
//     sanctionsCheck: true
//   },
//   {
//     id: 'CUST-004',
//     name: 'Atlantic Seafood Inc',
//     type: 'Distributor',
//     country: 'USA',
//     city: 'New York',
//     contactPerson: 'John Smith',
//     email: 'john@atlanticseafood.com',
//     currency: 'INR',
//     creditLimit: 60000000,
//     paymentTerms: 'Net 30',
//     kycStatus: true,
//     sanctionsCheck: true
//   },
//   {
//     id: 'CUST-005',
//     name: 'Euro Spices BV',
//     type: 'Importer',
//     country: 'Belgium',
//     city: 'Antwerp',
//     contactPerson: 'Marie Dubois',
//     email: 'm.dubois@eurospices.be',
//     currency: 'INR',
//     creditLimit: 20000000,
//     paymentTerms: 'Net 30',
//     kycStatus: true,
//     sanctionsCheck: true
//   }
// ];

// export const MOCK_PRODUCTS: Product[] = [
//   {
//     id: 'PROD-001',
//     name: 'Frozen Chicken Breast - 2kg pack',
//     category: 'Frozen Meat',
//     type: 'FROZEN',
//     hsCode: '0207.14.00',
//     temperature: '-18°C',
//     packSize: '2kg',
//     shelfLife: '12 months',
//     unitsPerCarton: 10,
//     cartonsPerPallet: 48,
//     notes: 'EU Health Cert Required'
//   },
//   {
//     id: 'PROD-002',
//     name: 'Whole Cleaned Shrimp - IQF',
//     category: 'Frozen Seafood',
//     type: 'FROZEN',
//     hsCode: '0306.17.00',
//     temperature: '-25°C',
//     packSize: '1kg',
//     shelfLife: '18 months',
//     unitsPerCarton: 12,
//     cartonsPerPallet: 56
//   },
//   {
//     id: 'PROD-003',
//     name: 'Black Tiger Prawns - Headless',
//     category: 'Frozen Seafood',
//     type: 'FROZEN',
//     hsCode: '0306.17.00',
//     temperature: '-25°C',
//     packSize: '500g',
//     shelfLife: '18 months',
//     unitsPerCarton: 20,
//     cartonsPerPallet: 60
//   },
//   {
//     id: 'PROD-004',
//     name: 'Ground Turmeric Powder',
//     category: 'Ground Spices',
//     type: 'SPICE',
//     hsCode: '0910.30.00',
//     temperature: 'Ambient',
//     packSize: '1kg',
//     shelfLife: '24 months',
//     unitsPerCarton: 20,
//     cartonsPerPallet: 40
//   },
//   {
//     id: 'PROD-005',
//     name: 'Whole Black Pepper',
//     category: 'Whole Spices',
//     type: 'SPICE',
//     hsCode: '0904.11.00',
//     temperature: 'Ambient',
//     packSize: '500g',
//     shelfLife: '36 months',
//     unitsPerCarton: 40,
//     cartonsPerPallet: 40
//   },
//   { 
//     id: 'PROD-006',
//     name: 'Cardamom Green - Premium',
//     category: 'Whole Spices',
//     type: 'SPICE',
//     hsCode: '0908.31.00',
//     temperature: 'Ambient',
//     packSize: '250g',
//     shelfLife: '24 months'
//   },
//   {
//     id: 'PROD-007',
//     name: 'Frozen Ready-to-Eat Samosas',
//     category: 'Frozen Ready-to-Eat',
//     type: 'FROZEN',
//     hsCode: '1902.20.00',
//     temperature: '-18°C',
//     packSize: '500g',
//     shelfLife: '6 months'
//   },
//   {
//     id: 'PROD-008',
//     name: 'Garam Masala Blend',
//     category: 'Blends',
//     type: 'SPICE',
//     hsCode: '0910.91.00',
//     temperature: 'Ambient',
//     packSize: '100g',
//     shelfLife: '18 months'
//   }
// ];

// export const MOCK_SHIPMENTS: Shipment[] = [
//   {
//     id: 'SHP-2023-001',
//     reference: 'IMP-FZ-001',
//     masterDoc: 'MAEU123456789',
//     customer: 'Nordic Foods AS',
//     customerId: 'CUST-001',
//     origin: { code: 'VNSGN', city: 'Ho Chi Minh', country: 'Vietnam' },
//     destination: { code: 'NLRTM', city: 'Rotterdam', country: 'Netherlands' },
//     mode: 'SEA',
//     direction: 'IMPORT',
//     commodity: 'FROZEN',
//     status: 'ON_VESSEL',
//     slaStatus: 'ON_TIME',
//     etd: '2023-10-01',
//     eta: '2023-10-25',
//     temperature: { setPoint: -18, unit: 'C', range: '+/- 2C', alerts: 0 },
//     events: [
//       { id: '1', status: 'BOOKED', timestamp: '2023-09-15 09:00', location: 'HCM', description: 'Booking confirmed', user: 'System' },
//       { id: '2', status: 'PICKED_UP', timestamp: '2023-09-28 14:00', location: 'Factory', description: 'Container loaded', user: 'Ops Team' },
//       { id: '3', status: 'ON_VESSEL', timestamp: '2023-10-02 08:00', location: 'VNSGN', description: 'Vessel departed', user: 'Carrier API' },
//     ],
//     documents: [
//       { id: 'd1', name: 'Commercial Invoice', type: 'INVOICE', status: 'APPROVED', uploadDate: '2023-09-20' },
//       { id: 'd2', name: 'Bill of Lading', type: 'BILL_LADING', status: 'DRAFT' },
//       { id: 'd3', name: 'Health Certificate', type: 'HEALTH_CERT', status: 'SUBMITTED', uploadDate: '2023-09-25' },
//     ],
//     cargo: [
//       { id: 'c1', productName: 'Frozen Black Tiger Shrimp', hsCode: '030617', quantity: 1200, unit: 'Cartons', weightKg: 12000, tempReq: '-18C', packaging: 'Master Carton' }
//     ],
//     financials: { currency: 'INR', revenue: 360000, cost: 256000, margin: 104000, invoiceStatus: 'SENT' }
//   },
//   {
//     id: 'SHP-2023-002',
//     reference: 'EXP-SP-045',
//     masterDoc: '098-12345675',
//     customer: 'Spice World GmbH',
//     customerId: 'CUST-002',
//     origin: { code: 'INMAA', city: 'Chennai', country: 'India' },
//     destination: { code: 'DEHAM', city: 'Hamburg', country: 'Germany' },
//     mode: 'AIR',
//     direction: 'EXPORT',
//     commodity: 'SPICE',
//     status: 'CUSTOMS_EXPORT',
//     slaStatus: 'AT_RISK',
//     etd: '2023-10-12',
//     eta: '2023-10-14',
//     temperature: { setPoint: 20, unit: 'C', range: 'Ambient', alerts: 0 },
//     events: [
//       { id: '1', status: 'BOOKED', timestamp: '2023-10-10 10:00', location: 'Chennai', description: 'Booking confirmed', user: 'Sales' },
//       { id: '2', status: 'PICKED_UP', timestamp: '2023-10-11 11:30', location: 'Warehouse', description: 'Picked up for airport', user: 'Trucking Co' },
//     ],
//     documents: [
//       { id: 'd1', name: 'Commercial Invoice', type: 'INVOICE', status: 'APPROVED' },
//       { id: 'd2', name: 'Phytosanitary Cert', type: 'HEALTH_CERT', status: 'MISSING' },
//     ],
//     cargo: [
//       { id: 'c1', productName: 'Organic Turmeric Powder', hsCode: '091030', quantity: 500, unit: 'Bags', weightKg: 1000, tempReq: 'Dry', packaging: '25kg Bag' }
//     ],
//     financials: { currency: 'INR', revenue: 176000, cost: 120000, margin: 56000, invoiceStatus: 'DRAFT' }
//   },
//   {
//     id: 'SHP-2023-003',
//     reference: 'IMP-FZ-088',
//     masterDoc: 'OOLU123987',
//     customer: 'Fresh Mart LLC', 
//     customerId: 'CUST-003',
//     origin: { code: 'THBKK', city: 'Bangkok', country: 'Thailand' },
//     destination: { code: 'AEDXB', city: 'Dubai', country: 'UAE' }, 
//     mode: 'SEA',
//     direction: 'IMPORT',
//     commodity: 'FROZEN',
//     status: 'EXCEPTION',
//     slaStatus: 'BREACHED',
//     etd: '2023-09-20',
//     eta: '2023-10-15',
//     temperature: { setPoint: -18, unit: 'C', range: '+/- 2C', alerts: 3 },
//     events: [
//        { id: '1', status: 'ON_VESSEL', timestamp: '2023-09-21', location: 'THBKK', description: 'Departed', user: 'System' },
//        { id: '2', status: 'EXCEPTION', timestamp: '2023-10-10', location: 'At Sea', description: 'Temp Deviation Detected: -12C', user: 'IoT Sensor' },
//     ],
//     documents: [],
//     cargo: [],
//     financials: { currency: 'INR', revenue: 640000, cost: 480000, margin: 160000, invoiceStatus: 'PAID' }
//   },
//     {
//     id: 'SHP-2023-004',
//     reference: 'EXP-FZ-102',
//     masterDoc: 'MAEU882211',
//     customer: 'Atlantic Seafood Inc',
//     customerId: 'CUST-004',
//     origin: { code: 'INNSA', city: 'Nhava Sheva', country: 'India' },
//     destination: { code: 'USNYC', city: 'New York', country: 'USA' }, 
//     mode: 'SEA',
//     direction: 'EXPORT',
//     commodity: 'FROZEN',
//     status: 'DELIVERED',
//     slaStatus: 'ON_TIME',
//     etd: '2023-09-01',
//     eta: '2023-09-20',
//     temperature: { setPoint: -18, unit: 'C', range: '+/- 2C', alerts: 0 },
//     events: [],
//     documents: [],
//     cargo: [],
//     financials: { currency: 'INR', revenue: 280000, cost: 168000, margin: 112000, invoiceStatus: 'PAID' }
//   },
//   {
//     id: 'SHP-2023-005',
//     reference: 'IMP-SP-012',
//     masterDoc: 'AWB-123-111',
//     customer: 'Euro Spices BV', 
//     customerId: 'CUST-005',
//     origin: { code: 'LKCMB', city: 'Colombo', country: 'Sri Lanka' },
//     destination: { code: 'BEANR', city: 'Antwerp', country: 'Belgium' }, 
//     mode: 'SEA',
//     direction: 'IMPORT',
//     commodity: 'SPICE',
//     status: 'AT_PORT_DEST',
//     slaStatus: 'ON_TIME',
//     etd: '2023-09-25',
//     eta: '2023-10-18',
//     temperature: { setPoint: 25, unit: 'C', range: 'Ambient', alerts: 0 },
//     events: [],
//     documents: [],
//     cargo: [],
//     financials: { currency: 'INR', revenue: 144000, cost: 88000, margin: 56000, invoiceStatus: 'SENT' }
//   }
// ];

// export const MOCK_ALL_DOCUMENTS: Document[] = [
//     { 
//         id: 'doc-001', 
//         name: 'Bill of Lading', 
//         type: 'BILL_LADING', 
//         status: 'FINAL', 
//         shipmentRef: 'GFF-2024-001234', 
//         customerName: 'Nordic Foods AS',
//         expiryDate: '—'
//     },
//     { 
//         id: 'doc-002', 
//         name: 'Phytosanitary Certificate', 
//         type: 'HEALTH_CERT', 
//         status: 'PENDING', 
//         shipmentRef: 'GFF-2024-001235', 
//         customerName: 'Spice World GmbH',
//         expiryDate: '—'
//     },
//     { 
//         id: 'doc-003', 
//         name: 'Health Certificate', 
//         type: 'HEALTH_CERT', 
//         status: 'FINAL', 
//         shipmentRef: 'GFF-2024-001234', 
//         customerName: 'Nordic Foods AS',
//         expiryDate: '2025-06-15'
//     },
//     { 
//         id: 'doc-004', 
//         name: 'Commercial Invoice', 
//         type: 'INVOICE', 
//         status: 'DRAFT', 
//         shipmentRef: 'GFF-2024-001237', 
//         customerName: 'Atlantic Seafood Inc',
//         expiryDate: '—'
//     },
//     { 
//         id: 'doc-005', 
//         name: 'Certificate of Origin', 
//         type: 'ORIGIN_CERT', 
//         status: 'SUBMITTED', 
//         shipmentRef: 'GFF-2024-001236', 
//         customerName: 'Fresh Mart LLC',
//         expiryDate: '—'
//     },
//     { 
//         id: 'doc-006', 
//         name: 'Insurance Certificate', 
//         type: 'INSURANCE', 
//         status: 'NOT_RECEIVED', 
//         shipmentRef: 'GFF-2024-001238', 
//         customerName: 'Euro Spices BV',
//         expiryDate: '—'
//     }
// ];

// export const MOCK_QUOTES: Quote[] = [
//   {
//     id: 'q1',
//     reference: 'QT-2024-0089',
//     customer: 'Nordic Foods AS',
//     origin: { city: 'Mumbai', country: 'India' },
//     destination: { city: 'Oslo', country: 'Norway' },
//     mode: 'SEA',
//     commodity: 'FROZEN',
//     estValue: 3360000,
//     currency: 'INR',
//     validTill: '2024-12-15',
//     status: 'SENT'
//   },
//   {
//     id: 'q2',
//     reference: 'QT-2024-0090',
//     customer: 'Spice World GmbH',
//     origin: { city: 'Kochi', country: 'India' },
//     destination: { city: 'Berlin', country: 'Germany' },
//     mode: 'SEA',
//     commodity: 'SPICE',
//     estValue: 2240000,
//     currency: 'INR',
//     validTill: '2024-12-20',
//     status: 'DRAFT'
//   },
//   {
//     id: 'q3',
//     reference: 'QT-2024-0088',
//     customer: 'Fresh Mart LLC',
//     origin: { city: 'Chennai', country: 'India' },
//     destination: { city: 'Dubai', country: 'UAE' },
//     mode: 'AIR',
//     commodity: 'FROZEN',
//     estValue: 1200000,
//     currency: 'INR',
//     validTill: '2024-12-10',
//     status: 'ACCEPTED'
//   }
// ];

// export const MOCK_INVOICES: Invoice[] = [
//   {
//     id: 'inv1',
//     invoiceNumber: 'IV-INV-2024-0456',
//     customerName: 'Nordic Foods AS',
//     shipmentRef: 'SHP001',
//     issueDate: '2024-12-01',
//     dueDate: '2024-12-31',
//     amount: 3600000,
//     currency: 'INR',
//     status: 'DRAFT',
//     customerGstin: '27AABCU9603R1ZN',
//     placeOfSupply: 'Maharashtra',
//     tdsRate: 0,
//     tdsAmount: 0,
//     subtotal: 3600000,
//     totalTax: 0
//   },
//   {
//     id: 'inv2',
//     invoiceNumber: 'IV-INV-2024-0457',
//     customerName: 'Spice World GmbH',
//     shipmentRef: 'SHP002',
//     issueDate: '2024-12-05',
//     dueDate: '2024-12-15',
//     amount: 2240000,
//     currency: 'INR',
//     status: 'SENT',
//     customerGstin: 'FOREIGN',
//     placeOfSupply: 'Germany',
//     tdsRate: 0,
//     tdsAmount: 0,
//     subtotal: 2240000,
//     totalTax: 0
//   },
//   {
//     id: 'inv3',
//     invoiceNumber: 'IV-INV-2024-0455',
//     customerName: 'Fresh Mart LLC',
//     shipmentRef: 'SHP003',
//     issueDate: '2024-12-10',
//     dueDate: '2024-12-25',
//     amount: 1000000,
//     currency: 'INR',
//     status: 'PAID',
//     customerGstin: 'FOREIGN',
//     placeOfSupply: 'UAE',
//     tdsRate: 0,
//     tdsAmount: 0,
//     subtotal: 1000000,
//     totalTax: 0
//   },
//   {
//     id: 'inv4',
//     invoiceNumber: 'IV-INV-2024-0450',
//     customerName: 'Atlantic Seafood Inc',
//     shipmentRef: 'SHP004',
//     issueDate: '2024-11-01',
//     dueDate: '2024-12-01',
//     amount: 6800000,
//     currency: 'INR',
//     status: 'OVERDUE',
//     customerGstin: 'FOREIGN',
//     placeOfSupply: 'USA',
//     tdsRate: 0,
//     tdsAmount: 0,
//     subtotal: 6800000,
//     totalTax: 0
//   }
// ];

export const MOCK_AUDIT_LOGS: AuditLogEntry[] = [
    {
        id: 'log1',
        action: 'Status Updated',
        entityRef: 'SHP001',
        entityType: 'Shipment',
        role: 'Ops',
        description: 'Status changed from "Export Customs" to "On Vessel"',
        user: 'Raj Sharma',
        timestamp: '12/5/2024, 8:00:00 PM',
        iconType: 'user'
    },
    {
        id: 'log2',
        action: 'Document Uploaded',
        entityRef: 'SHP002',
        entityType: 'Shipment',
        role: 'Documentation',
        description: 'Uploaded Commercial Invoice',
        user: 'Priya M.',
        timestamp: '12/5/2024, 3:45:00 PM',
        iconType: 'document'
    },
    {
        id: 'log3',
        action: 'Invoice Created',
        entityRef: 'INV001',
        entityType: 'Finance',
        role: 'Finance',
        description: 'Invoice IV-INV-2024-0456 created for ₹36,00,000',
        user: 'Finance Team',
        timestamp: '12/5/2024, 2:30:00 PM',
        iconType: 'invoice'
    },
    {
        id: 'log4',
        action: 'Exception Flagged',
        entityRef: 'SHP004',
        entityType: 'System',
        role: 'System',
        description: 'FDA Hold - Random inspection selected',
        user: 'System',
        timestamp: '12/4/2024, 1:30:00 PM',
        iconType: 'alert'
    },
    {
        id: 'log5',
        action: 'Customer Created',
        entityRef: 'C001',
        entityType: 'Admin',
        role: 'Admin',
        description: 'New customer "Nordic Foods AS" added',
        user: 'Admin User',
        timestamp: '12/3/2024, 5:00:00 PM',
        iconType: 'user'
    },
    {
        id: 'log6',
        action: 'Quote Approved',
        entityRef: 'QT-2024-0088',
        entityType: 'Quote',
        role: 'Sales',
        description: 'Quote approved by Fresh Mart LLC',
        user: 'Sales Team',
        timestamp: '12/3/2024, 11:00:00 AM',
        iconType: 'check'
    },
    {
        id: 'log7',
        action: 'KYC Verified',
        entityRef: 'CUST-002',
        entityType: 'Customer',
        role: 'Admin',
        description: 'KYC verification completed for Spice World GmbH',
        user: 'Admin User',
        timestamp: '12/2/2024, 09:30:00 AM',
        iconType: 'check'
    }
];

// export const MOCK_SYSTEM_USERS: SystemUser[] = [
//   { id: 'U1', name: 'Admin User', email: 'admin@indovista.com', role: 'Admin', status: 'Active', lastLogin: '2024-12-05 10:00' },
//   { id: 'U2', name: 'Raj Sharma', email: 'raj.s@indovista.com', role: 'Operations', status: 'Active', lastLogin: '2024-12-05 09:30' },
//   { id: 'U3', name: 'Priya M.', email: 'priya.m@indovista.com', role: 'Documentation', status: 'Active', lastLogin: '2024-12-05 08:45' },
//   { id: 'U4', name: 'Finance Team', email: 'finance@indovista.com', role: 'Finance', status: 'Active', lastLogin: '2024-12-05 11:15' },
// ];

export const MOCK_COMPLIANCE_TASKS: ComplianceTask[] = [
    {
        id: 'T1',
        type: 'KYC_REVIEW',
        entityName: 'New Global Traders LLC',
        entityId: 'CUST-TEMP-99',
        description: 'Review new customer KYC documents for approval',
        status: 'PENDING',
        assignedTo: 'Admin User',
        dueDate: '2024-12-10',
        createdDate: '2024-12-05',
        priority: 'HIGH'
    },
    {
        id: 'T2',
        type: 'DOC_VALIDATION',
        entityName: 'SHP-2023-002',
        entityId: 'SHP-2023-002',
        description: 'Validate Phytosanitary Certificate for export to Germany',
        status: 'PENDING',
        assignedTo: 'Priya M.',
        dueDate: '2024-12-08',
        createdDate: '2024-12-06',
        priority: 'HIGH'
    },
    {
        id: 'T3',
        type: 'SANCTIONS_CHECK',
        entityName: 'Atlantic Seafood Inc',
        entityId: 'CUST-004',
        description: 'Periodic sanctions list screening check',
        status: 'PENDING',
        dueDate: '2024-12-15',
        createdDate: '2024-12-01',
        priority: 'MEDIUM'
    }
];

export const CHART_DATA_VOLUME = [
  { name: 'Jan', Export: 40, Import: 24 },
  { name: 'Feb', Export: 30, Import: 13 },
  { name: 'Mar', Export: 20, Import: 58 },
  { name: 'Apr', Export: 27, Import: 39 },
  { name: 'May', Export: 18, Import: 48 },
  { name: 'Jun', Export: 23, Import: 38 },
  { name: 'Jul', Export: 34, Import: 43 },
];

export const CHART_DATA_MODE = [
  { name: 'Sea', value: 400, color: '#0088FE' },
  { name: 'Air', value: 120, color: '#00C49F' },
  { name: 'Road', value: 80, color: '#FFBB28' },
];
