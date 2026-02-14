import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { policiesApi } from '../services/api';
import { Link } from 'react-router-dom';
import { FileText, Search, Phone } from 'lucide-react';

function daysColor(days) {
  if (days < 0) return 'text-gray-400';
  if (days <= 30) return 'text-red-600 font-semibold';
  if (days <= 60) return 'text-yellow-600';
  return 'text-green-600';
}

export default function PoliciesPage() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['policies', page, filters],
    queryFn: () => policiesApi.list({ page, page_size: 25, ...filters }).then(r => r.data),
    keepPreviousData: true,
  });

  const policies = data?.items || [];
  const total = data?.total || 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-7 h-7 text-sentinel-500" /> Policies
          </h1>
          <p className="text-sm text-gray-500 mt-1">{total} policies</p>
        </div>
      </div>

      <div className="card flex flex-wrap gap-4 items-end">
        <div>
          <label className="label">Status</label>
          <select className="input" value={filters.status || ''} onChange={e => setFilters(f => ({ ...f, status: e.target.value || undefined }))}>
            <option value="">All</option>
            <option value="Active">Active</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Expired">Expired</option>
          </select>
        </div>
        <div>
          <label className="label">LOB</label>
          <select className="input" value={filters.line_of_business || ''} onChange={e => setFilters(f => ({ ...f, line_of_business: e.target.value || undefined }))}>
            <option value="">All LOBs</option>
            <option value="Personal Auto">Personal Auto</option>
            <option value="Homeowners">Homeowners</option>
            <option value="Renters">Renters</option>
            <option value="Umbrella">Umbrella</option>
            <option value="Flood">Flood</option>
            <option value="Condo">Condo</option>
            <option value="Commercial General Liability">Commercial GL</option>
            <option value="Business Owners Policy">BOP</option>
            <option value="Workers Compensation">Workers Comp</option>
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-3 font-medium text-gray-500">Policy #</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500">LOB</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500">Status</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500">Premium</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500">Effective</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500">Expiration</th>
              <th className="text-left py-3 px-3 font-medium text-gray-500">Renewal</th>
            </tr>
          </thead>
          <tbody>
            {policies.map(p => {
              const daysUntil = Math.ceil((new Date(p.expiration_date) - new Date()) / 86400000);
              return (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 px-3 font-medium">
                    <Link to={`/policies/${p.id}`} className="text-sentinel-600 hover:text-sentinel-700">
                      {p.policy_number || 'View'}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3">{p.line_of_business}</td>
                  <td className="py-2.5 px-3">
                    <span className={`badge ${p.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>{p.status}</span>
                  </td>
                  <td className="py-2.5 px-3">{p.premium ? `$${Number(p.premium).toLocaleString()}` : '—'}</td>
                  <td className="py-2.5 px-3 text-gray-500">{new Date(p.effective_date).toLocaleDateString()}</td>
                  <td className={`py-2.5 px-3 ${daysColor(daysUntil)}`}>
                    {new Date(p.expiration_date).toLocaleDateString()}
                    {daysUntil > 0 && <span className="text-xs ml-1">({daysUntil}d)</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`badge ${p.renewal_status === 'Bound' ? 'badge-green' : p.renewal_status === 'Not Started' ? 'badge-gray' : 'badge-blue'}`}>
                      {p.renewal_status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {policies.length === 0 && !isLoading && (
          <p className="text-center py-8 text-gray-400">No policies found</p>
        )}
      </div>
    </div>
  );
}
