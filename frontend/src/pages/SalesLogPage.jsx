import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesLogApi } from '../services/api';
import { TrendingUp, Car, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import SalesLogModal from '../components/common/SalesLogModal';

const COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2', '#4f46e5', '#be185d'];

export default function SalesLogPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showModal, setShowModal] = useState(false);

  const { data: summary } = useQuery({
    queryKey: ['salesSummary'],
    queryFn: () => salesLogApi.summary().then(r => r.data),
  });

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['salesList', { date_from: dateFrom, date_to: dateTo }],
    queryFn: () => salesLogApi.list({ date_from: dateFrom || undefined, date_to: dateTo || undefined, page_size: 100 }).then(r => r.data),
  });

  const { data: lobTrends } = useQuery({
    queryKey: ['salesTrendsLob'],
    queryFn: () => salesLogApi.trends({ group_by: 'lob', period: 'monthly' }).then(r => r.data),
  });

  const { data: sourceTrends } = useQuery({
    queryKey: ['salesTrendsSource'],
    queryFn: () => salesLogApi.trends({ group_by: 'source', period: 'monthly' }).then(r => r.data),
  });

  const items = salesData?.items || [];
  const quota = summary?.allstate_quota || {};

  // Build chart data from trends
  const lobChartData = {};
  (lobTrends?.trends || []).forEach(t => {
    if (!lobChartData[t.group]) lobChartData[t.group] = 0;
    lobChartData[t.group] += t.count;
  });
  const lobBars = Object.entries(lobChartData).map(([name, value]) => ({ name: name.replace('Personal ', 'P. ').replace('Commercial ', 'C. '), count: value }));

  const sourceChartData = {};
  (sourceTrends?.trends || []).forEach(t => {
    if (!sourceChartData[t.group]) sourceChartData[t.group] = 0;
    sourceChartData[t.group] += t.count;
  });
  const sourcePie = Object.entries(sourceChartData).map(([name, value]) => ({ name, value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-sentinel-500" />
            Sales Performance Log
          </h1>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Log Sale
        </button>
      </div>

      {showModal && <SalesLogModal onClose={() => setShowModal(false)} />}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Today', data: summary?.today },
          { label: 'This Week', data: summary?.this_week },
          { label: 'This Month', data: summary?.this_month },
          { label: 'YTD', data: summary?.ytd },
        ].map(({ label, data }) => (
          <div key={label} className="card text-center">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-bold mt-1">{data?.count || 0}</p>
            <p className="text-xs text-green-600">${Number(data?.premium || 0).toLocaleString()}</p>
          </div>
        ))}
        <div className="card text-center">
          <div className="flex items-center justify-center gap-1">
            <Car className="w-4 h-4 text-sentinel-500" />
            <p className="text-xs text-gray-500">Auto Quota</p>
          </div>
          <p className="text-2xl font-bold mt-1">{quota.auto_items_this_month || 0}<span className="text-sm text-gray-400">/13</span></p>
          <div className="h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
            <div
              className={`h-full rounded-full ${(quota.auto_items_this_month || 0) >= 13 ? 'bg-green-500' : 'bg-sentinel-500'}`}
              style={{ width: `${Math.min(100, ((quota.auto_items_this_month || 0) / 13) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {lobBars.length > 0 && (
          <div className="card">
            <h3 className="font-semibold mb-4">Sales by Line of Business (YTD)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={lobBars}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {sourcePie.length > 0 && (
          <div className="card">
            <h3 className="font-semibold mb-4">Sales by Source (YTD)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={sourcePie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }) => `${name}: ${value}`}>
                  {sourcePie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Sales table */}
      <div className="card">
        <div className="flex items-center gap-4 mb-4">
          <div>
            <label className="label">From</label>
            <input type="date" className="input" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="label">To</label>
            <input type="date" className="input" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-3 font-medium text-gray-500">Date</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Insured</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">LOB</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Premium</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Carrier</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Source</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Type</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Zip</th>
              </tr>
            </thead>
            <tbody>
              {items.map(entry => (
                <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 px-3">{new Date(entry.date).toLocaleDateString()}</td>
                  <td className="py-2.5 px-3 font-medium">{entry.account_name || '—'}</td>
                  <td className="py-2.5 px-3">{entry.line_of_business}</td>
                  <td className="py-2.5 px-3 text-green-600 font-medium">${Number(entry.premium).toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-gray-500">{entry.carrier_name || '—'}</td>
                  <td className="py-2.5 px-3">{entry.source || '—'}</td>
                  <td className="py-2.5 px-3"><span className="badge badge-blue">{entry.sale_type}</span></td>
                  <td className="py-2.5 px-3 text-gray-500">{entry.zip_code || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && !isLoading && (
            <p className="text-center py-8 text-gray-400">No sales logged yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
