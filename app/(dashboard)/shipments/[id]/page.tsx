"use client";
import React, { useState } from 'react';
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { ArrowLeft, MapPin, Calendar, Thermometer, FileText, CheckCircle, Clock, AlertTriangle, Box, DollarSign } from 'lucide-react';
import { Shipment, ShipmentEvent, Document } from '@/types';


// Subcomponents for tabs
const OverviewTab = ({ shipment }: { shipment: Shipment }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="md:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Route Information</h3>
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative">
                {/* Visual Line */}
                <div className="hidden md:block absolute top-1/2 left-20 right-20 h-0.5 bg-gray-200 -z-10"></div>
                
                <div className="text-center bg-white p-2">
                    <div className="text-sm text-gray-500 mb-1">Origin</div>
                    <div className="text-xl font-bold text-gray-900">{shipment.origin.code}</div>
                    <div className="text-sm text-gray-600">{shipment.origin.city}, {shipment.origin.country}</div>
                </div>

                <div className="flex flex-col items-center bg-white p-2">
                    <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold mb-2">
                        {shipment.mode} - {shipment.masterDoc}
                    </div>
                    <div className="text-xs text-gray-500">ETD: {shipment.etd}</div>
                </div>

                <div className="text-center bg-white p-2">
                    <div className="text-sm text-gray-500 mb-1">Destination</div>
                    <div className="text-xl font-bold text-gray-900">{shipment.destination.code}</div>
                    <div className="text-sm text-gray-600">{shipment.destination.city}, {shipment.destination.country}</div>
                </div>
            </div>
        </Card>

        <Card>
            <h3 className="font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Shipment Specs</h3>
            <div className="space-y-4">
                 <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Commodity Type</span>
                    <span className="text-sm font-medium">{shipment.commodity}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Temperature Req</span>
                    <span className="text-sm font-medium flex items-center gap-1 text-blue-600">
                        <Thermometer className="w-4 h-4" />
                        {shipment.temperature.setPoint}°{shipment.temperature.unit} ({shipment.temperature.range})
                    </span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Incoterms</span>
                    <span className="text-sm font-medium">CIF (Cost, Insurance & Freight)</span>
                 </div>
            </div>
        </Card>

        <Card>
             <h3 className="font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">Customer Details</h3>
             <div className="space-y-4">
                 <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Consignee</span>
                    <span className="text-sm font-medium text-right">{shipment.customer}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Reference</span>
                    <span className="text-sm font-medium">{shipment.reference}</span>
                 </div>
            </div>
        </Card>
    </div>
);

const TimelineTab = ({ events }: { events: ShipmentEvent[] }) => (
    <Card>
        <h3 className="font-semibold text-gray-900 mb-6">Status History</h3>
        <div className="relative border-l-2 border-gray-200 ml-3 space-y-8 pb-4">
            {events.length === 0 && <div className="pl-6 text-gray-500">No events recorded yet.</div>}
            {events.map((event, idx) => (
                <div key={event.id} className="relative pl-8">
                    {/* Dot */}
                    <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white ${event.status === 'EXCEPTION' ? 'bg-red-500' : 'bg-blue-600'}`}></div>
                    
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                        <div>
                            <span className="text-sm font-bold text-gray-900 block">
                                {event.status.replace('_', ' ')}
                            </span>
                            <span className="text-sm text-gray-600">{event.description}</span>
                        </div>
                        <div className="text-right">
                            <div className="text-xs text-gray-500">{event.timestamp}</div>
                            <div className="text-xs text-gray-400 font-medium">{event.location} • {event.user}</div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    </Card>
);

const DocumentsTab = ({ documents }: { documents: Document[] }) => (
    <Card>
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-gray-900">Required Documentation</h3>
            <button className="text-sm text-blue-600 hover:underline">+ Upload New</button>
        </div>
        <div className="space-y-4">
            {documents.length === 0 && <div className="text-gray-500 italic">No documents required or uploaded.</div>}
            {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white border rounded">
                            <FileText className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                            <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                            <div className="text-xs text-gray-500">{doc.type}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <StatusBadge status={doc.status} />
                        {doc.uploadDate && <span className="text-xs text-gray-400 hidden sm:block">Uploaded: {doc.uploadDate}</span>}
                        <button className="text-gray-400 hover:text-gray-600">...</button>
                    </div>
                </div>
            ))}
        </div>
    </Card>
);

const CargoTab = ({ shipment }: { shipment: Shipment }) => (
    <Card noPadding>
        <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                <tr>
                    <th className="px-6 py-3">Product Name</th>
                    <th className="px-6 py-3">HS Code</th>
                    <th className="px-6 py-3">Quantity</th>
                    <th className="px-6 py-3">Weight</th>
                    <th className="px-6 py-3">Temp Req</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {shipment.cargo.map(item => (
                    <tr key={item.id}>
                        <td className="px-6 py-4 font-medium text-gray-900">{item.productName}</td>
                        <td className="px-6 py-4 text-gray-600 font-mono">{item.hsCode}</td>
                        <td className="px-6 py-4">{item.quantity} {item.unit}</td>
                        <td className="px-6 py-4">{item.weightKg} kg</td>
                        <td className="px-6 py-4">
                            <span className="inline-flex items-center text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                                {item.tempReq}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </Card>
);

const ShipmentDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState('overview');
  
  // In a real app, useQuery hook here.
  const { data: shipment, isLoading, isError } = useQuery({
  queryKey: ["shipment", id],
  queryFn: async () => {
    const res = await fetch(`/api/shipments/${id}`);
    if (!res.ok) throw new Error("Failed to load shipment");
    return res.json();
  },
  enabled: !!id,
});

if (isLoading) return <div className="p-8 text-center text-gray-500">Loading…</div>;
if (isError || !shipment) return <div className="p-8 text-center text-gray-500">Shipment not found</div>;

  if (!shipment) return <div className="p-8 text-center text-gray-500">Shipment not found</div>;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: CheckCircle },
    { id: 'timeline', label: 'Timeline & Status', icon: Clock },
    { id: 'cargo', label: 'Cargo & Pack', icon: Box },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'billing', label: 'Financials', icon: DollarSign },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/shipments" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-2">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Shipments
          </Link>
          <div className="flex items-center gap-3">
             <h1 className="text-2xl font-bold text-gray-900">{shipment.reference}</h1>
             <StatusBadge status={shipment.status} />
          </div>
          <div className="text-sm text-gray-500 mt-1 flex gap-4">
             <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {shipment.origin.code} to {shipment.destination.code}</span>
             <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> ETA: {shipment.eta}</span>
          </div>
        </div>
        <div className="flex gap-2">
            <button className="px-4 py-2 border border-gray-300 bg-white rounded-md text-sm font-medium hover:bg-gray-50">Edit</button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Add Event</button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-gray-200">
         <nav className="-mb-px flex space-x-8 overflow-x-auto">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                        whitespace-nowrap pb-4 px-1 border-b-2  font-medium text-sm flex items-center gap-2
                        ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                    `}
                >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                </button>
            ))}
         </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && <OverviewTab shipment={shipment} />}
        {activeTab === 'timeline' && <TimelineTab events={shipment.events} />}
        {activeTab === 'documents' && <DocumentsTab documents={shipment.documents} />}
        {activeTab === 'cargo' && <CargoTab shipment={shipment} />}
        {activeTab === 'billing' && (
            <Card>
                <div className="grid grid-cols-3 gap-6 text-center">
                    <div className="p-4 bg-gray-50 rounded">
                        <div className="text-sm text-gray-500">Revenue</div>
                        <div className="text-2xl font-bold text-gray-900">{shipment.financials.currency} {shipment.financials.revenue}</div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded">
                        <div className="text-sm text-gray-500">Cost</div>
                        <div className="text-2xl font-bold text-gray-900">{shipment.financials.currency} {shipment.financials.cost}</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded border border-green-100">
                        <div className="text-sm text-green-700">Margin</div>
                        <div className="text-2xl font-bold text-green-800">{shipment.financials.currency} {shipment.financials.margin}</div>
                    </div>
                </div>
            </Card>
        )}
      </div>
    </div>
  );
};

export default ShipmentDetail;