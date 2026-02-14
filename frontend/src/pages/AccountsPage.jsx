import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { accountsApi } from '../services/api';
import { Users, Search, Plus, Phone, ChevronRight } from 'lucide-react';

export default function AccountsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['accounts', { page, search, type: typeFilter, status: statusFilter }],
    queryFn: () => accountsApi.list({ page, page_size: 25, search: search || undefined, type: typeFilter || undefined, status: statusFilter || undefined }).then(r => r.data),
    keepPreviousData: true,
  });

  const accounts = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 25);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-sentinel-500" />
            Accounts
          </h1>
          <p className="text-sm text-gray-500 mt-1">{total} accounts</p>
        </div>
        <Link to="/accounts/new" className="btn-primary flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Account
        </Link>
      </div>

      {/* Search and filters */}
      <div className="card flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Name, email, phone..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
            <option value="">All Types</option>
            <option value="Personal">Personal</option>
            <option value="Commercial">Commercial</option>
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="Prospect">Prospect</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sentinel-500" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-3 font-medium text-gray-500">Name</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Type</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Phone</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">City</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Zip</th>
                <th className="py-3 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acct => (
                <tr key={acct.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-2.5 px-3">
                    <Link to={`/accounts/${acct.id}`} className="font-medium text-sentinel-600 hover:text-sentinel-700">
                      {acct.name}
                    </Link>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`badge ${acct.type === 'Commercial' ? 'badge-purple' : 'badge-blue'}`}>
                      {acct.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`badge ${acct.status === 'Active' ? 'badge-green' : acct.status === 'Inactive' ? 'badge-gray' : 'badge-yellow'}`}>
                      {acct.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    {acct.phone ? (
                      <a href={`tel:${acct.phone}`} className="text-sentinel-500 hover:text-sentinel-600 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> {acct.phone}
                      </a>
                    ) : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-gray-500">{acct.city || '—'}</td>
                  <td className="py-2.5 px-3 text-gray-500">{acct.zip_code || '—'}</td>
                  <td className="py-2.5 px-3">
                    <Link to={`/accounts/${acct.id}`} className="text-gray-400 hover:text-gray-600">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} ({total} total)
            </p>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="btn-secondary text-sm">Previous</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="btn-secondary text-sm">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
