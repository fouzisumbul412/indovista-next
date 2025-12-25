"use client";
import React from 'react';
import { Card } from '@/components/ui/Card';
import { KPIS, CHART_DATA_VOLUME, CHART_DATA_MODE} from '@/data/mock';
import { Metric } from '@/types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { ArrowUpRight, ArrowDownRight, Truck, Plane, Ship, AlertTriangle } from 'lucide-react';
import { StatusBadge } from '@/components/ui/Badge';

const KPIWidget: React.FC<{ kpi: Metric }> = ({ kpi }) => {
  const isUp = kpi.trend === 'up';
  const TrendIcon = isUp ? ArrowUpRight : ArrowDownRight;
  const trendColor = isUp ? 'text-green-600' : 'text-red-600'; // Simplification for demo

  return (
    <Card className="flex flex-col justify-between h-32">
      <div className="flex justify-between items-start">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{kpi.label}</h3>
        <span className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${isUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          <TrendIcon className="w-3 h-3 mr-1" />
          {kpi.change}
        </span>
      </div>
      <div>
        <div className="text-3xl font-bold text-gray-900">{kpi.value}</div>
      </div>
    </Card>
  );
};

// const Dashboard = () => {
//   const exceptions = MOCK_SHIPMENTS.filter(s => s.status === 'EXCEPTION' || s.slaStatus === 'BREACHED' || s.slaStatus === 'AT_RISK');

//   return (
//     <div className="space-y-6">
//       <div className="flex items-center justify-between">
//         <h1 className="text-2xl font-bold text-gray-900">Operations Overview</h1>
//         <div className="text-sm text-gray-500">Last updated: Just now</div>
//       </div>

//       {/* KPI Grid */}
//       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
//         {KPIS.map((kpi, idx) => <KPIWidget key={idx} kpi={kpi} />)}
//       </div>

//       {/* Charts Row */}
//       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//         <Card className="lg:col-span-2 min-h-[400px]">
//           <h3 className="text-lg font-bold text-gray-900 mb-6">Shipment Volume (Import vs Export)</h3>
//           <div className="h-80 w-full">
//             <ResponsiveContainer width="100%" height="100%">
//               <BarChart data={CHART_DATA_VOLUME}>
//                 <CartesianGrid strokeDasharray="3 3" vertical={false} />
//                 <XAxis dataKey="name" axisLine={false} tickLine={false} />
//                 <YAxis axisLine={false} tickLine={false} />
//                 <Tooltip cursor={{fill: '#f3f4f6'}} />
//                 <Legend />
//                 <Bar dataKey="Export" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
//                 <Bar dataKey="Import" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
//               </BarChart>
//             </ResponsiveContainer>
//           </div>
//         </Card>

//         <Card className="min-h-[400px]">
//           <h3 className="text-lg font-bold text-gray-900 mb-6">Transport Mode Share</h3>
//           <div className="h-64 w-full flex items-center justify-center">
//             <ResponsiveContainer width="100%" height="100%">
//               <PieChart>
//                 <Pie
//                   data={CHART_DATA_MODE}
//                   innerRadius={60}
//                   outerRadius={80}
//                   paddingAngle={5}
//                   dataKey="value"
//                 >
//                   {CHART_DATA_MODE.map((entry, index) => (
//                     <Cell key={`cell-${index}`} fill={entry.color} />
//                   ))}
//                 </Pie>
//                 <Tooltip />
//                 <Legend verticalAlign="bottom" height={36} />
//               </PieChart>
//             </ResponsiveContainer>
//           </div>
//           <div className="grid grid-cols-3 gap-2 mt-4 text-center">
//              <div className="p-2 bg-blue-50 rounded">
//                 <Ship className="w-5 h-5 mx-auto text-blue-600 mb-1" />
//                 <span className="text-xs font-semibold text-gray-700">66%</span>
//              </div>
//              <div className="p-2 bg-teal-50 rounded">
//                 <Plane className="w-5 h-5 mx-auto text-teal-600 mb-1" />
//                 <span className="text-xs font-semibold text-gray-700">20%</span>
//              </div>
//              <div className="p-2 bg-yellow-50 rounded">
//                 <Truck className="w-5 h-5 mx-auto text-yellow-600 mb-1" />
//                 <span className="text-xs font-semibold text-gray-700">14%</span>
//              </div>
//           </div>
//         </Card>
//       </div>

//       {/* Exception List */}
//       {/* <Card noPadding className="overflow-hidden">
//         <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-red-50">
//           <div className="flex items-center gap-2">
//             <AlertTriangle className="w-5 h-5 text-red-600" />
//             <h3 className="text-lg font-bold text-red-900">Critical Exceptions & Alerts</h3>
//           </div>
//           <button className="text-sm text-red-700 font-medium hover:underline">View All Exceptions</button>
//         </div>
//         <table className="w-full text-left text-sm">
//           <thead className="bg-gray-50 text-gray-500 uppercase font-semibold text-xs">
//             <tr>
//               <th className="px-6 py-3">Shipment Ref</th>
//               <th className="px-6 py-3">Route</th>
//               <th className="px-6 py-3">Issue</th>
//               <th className="px-6 py-3">Status</th>
//               <th className="px-6 py-3">Action</th>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-100">
//             {exceptions.map(shipment => (
//               <tr key={shipment.id} className="hover:bg-gray-50">
//                 <td className="px-6 py-4 font-medium text-gray-900">
//                   {shipment.reference}
//                   <div className="text-xs text-gray-500 font-normal">{shipment.commodity}</div>
//                 </td>
//                 <td className="px-6 py-4 text-gray-600">
//                   {shipment.origin.code} <span className="text-gray-400">→</span> {shipment.destination.code}
//                 </td>
//                 <td className="px-6 py-4 text-red-600 font-medium">
//                   {shipment.status === 'EXCEPTION' ? 'Temperature Deviation' : 'SLA Breach'}
//                 </td>
//                 <td className="px-6 py-4">
//                   <StatusBadge status={shipment.status} />
//                 </td>
//                 <td className="px-6 py-4">
//                   <button className="text-blue-600 hover:text-blue-800 font-medium text-xs">Resolve</button>
//                 </td>
//               </tr>
//             ))}
//             {exceptions.length === 0 && (
//                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No active exceptions. Great job!</td></tr>
//             )}
//           </tbody>
//         </table>
//       </Card> */}
//     </div>
//   );
// };

//export default Dashboard;


const Dashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Operations Overview
        </h1>
        <div className="text-sm text-gray-500">Last updated: Just now</div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {KPIS.map((kpi, idx) => (
          <KPIWidget key={idx} kpi={kpi} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 min-h-[400px]">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            Shipment Volume (Import vs Export)
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={CHART_DATA_VOLUME}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Export" fill="#3b82f6" barSize={20} />
                <Bar dataKey="Import" fill="#10b981" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="min-h-[400px]">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            Transport Mode Share
          </h3>
          <ResponsiveContainer width="100%" height="80%">
            <PieChart>
              <Pie
                data={CHART_DATA_MODE}
                innerRadius={60}
                outerRadius={80}
                dataKey="value"
              >
                {CHART_DATA_MODE.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
