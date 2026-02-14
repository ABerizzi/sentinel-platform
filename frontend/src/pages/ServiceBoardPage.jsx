import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceBoardApi } from '../services/api';
import { ClipboardList, List, LayoutGrid, Plus, Filter, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import ServiceItemModal from '../components/common/ServiceItemModal';

const STATUS_COLUMNS = [
  'Not Started', 'In Progress', 'Awaiting Insured', 'Awaiting Carrier', 'Action Required',
];

const TYPE_ICONS = {
  Renewal: '🔄', MidTermReview: '📋', Rewrite: '📝', Endorsement: '✏️',
  UWIssue: '⚠️', NonRenewal: '🚫', PaymentIssue: '💳', General: '📌',
};

function urgencyColor(urgency) {
  return { Critical: 'border-l-red-600 bg-red-50', High: 'border-l-orange-500', Medium: 'border-l-yellow-400', Low: 'border-l-gray-300' }[urgency] || '';
}

function dueDateColor(dueDate) {
  if (!dueDate) return 'text-gray-400';
  const days = Math.ceil((new Date(dueDate) - new Date()) / 86400000);
  if (days < 0) return 'text-red-600 font-semibold';
  if (days < 7) return 'text-red-500';
  if (days < 21) return 'text-yellow-600';
  return 'text-green-600';
}

function ServiceItemCard({ item, onStatusChange }) {
  return (
    <div className={`bg-white rounded-lg shadow-sm border-l-4 ${urgencyColor(item.urgency)} p-3 mb-2 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-1">
            <span title={item.type}>{TYPE_ICONS[item.type] || '📌'}</span>
            <span className="text-xs font-medium text-gray-500">{item.type}</span>
          </div>
          <p className="text-sm font-medium text-gray-900 truncate">{item.account_name || 'Unknown'}</p>
          {item.policy_lob && <p className="text-xs text-gray-500">{item.policy_lob}</p>}
          {item.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{item.description}</p>}
        </div>
        {item.account_name && (
          <a href={`tel:`} className="p-1 text-gray-400 hover:text-sentinel-500" title="Call">
            <Phone className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100">
        <span className={`text-xs ${dueDateColor(item.due_date)}`}>
          {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No date'}
        </span>
        {item.assignee_name && (
          <span className="text-xs text-gray-400">{item.assignee_name.split(' ')[0]}</span>
        )}
      </div>
    </div>
  );
}

export default function ServiceBoardPage() {
  const [view, setView] = useState('kanban');
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['serviceBoard', filters],
    queryFn: () => serviceBoardApi.list(filters).then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => serviceBoardApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serviceBoard'] });
      toast.success('Updated');
    },
  });

  const items = data?.items || [];
  const countsByStatus = data?.counts_by_status || {};
  const countsByType = data?.counts_by_type || {};

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-sentinel-500" />
            Service Board
          </h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} active items</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-1.5 text-sm">
            <Plus className="w-4 h-4" /> New
          </button>
          <button onClick={() => setShowFilters(!showFilters)} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Filter className="w-4 h-4" /> Filters
          </button>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setView('kanban')} className={`p-1.5 rounded ${view === 'kanban' ? 'bg-white shadow-sm' : ''}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setView('list')} className={`p-1.5 rounded ${view === 'list' ? 'bg-white shadow-sm' : ''}`}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Type filter pills */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilters(f => ({ ...f, type: undefined }))}
          className={`badge cursor-pointer ${!filters.type ? 'bg-sentinel-100 text-sentinel-700' : 'badge-gray'}`}
        >
          All ({items.length})
        </button>
        {Object.entries(countsByType).map(([type, count]) => (
          <button
            key={type}
            onClick={() => setFilters(f => ({ ...f, type: f.type === type ? undefined : type }))}
            className={`badge cursor-pointer ${filters.type === type ? 'bg-sentinel-100 text-sentinel-700' : 'badge-gray'}`}
          >
            {TYPE_ICONS[type]} {type} ({count})
          </button>
        ))}
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="card flex flex-wrap gap-4">
          <div>
            <label className="label">Urgency</label>
            <select className="input" value={filters.urgency || ''} onChange={e => setFilters(f => ({ ...f, urgency: e.target.value || undefined }))}>
              <option value="">All</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          <div>
            <label className="label">Search</label>
            <input
              className="input"
              placeholder="Account name..."
              value={filters.search || ''}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value || undefined }))}
            />
          </div>
          <div className="flex items-end">
            <button onClick={() => { setFilters({}); setShowFilters(false); }} className="btn-secondary text-sm">Clear</button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sentinel-500" />
        </div>
      ) : view === 'kanban' ? (
        /* ========== KANBAN VIEW ========== */
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
          {STATUS_COLUMNS.map(status => {
            const colItems = items.filter(i => i.status === status);
            return (
              <div key={status} className="flex-shrink-0 w-72">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">{status}</h3>
                  <span className="badge badge-gray text-xs">{colItems.length}</span>
                </div>
                <div className="space-y-0 min-h-[200px] bg-gray-50 rounded-lg p-2">
                  {colItems.map(item => (
                    <ServiceItemCard key={item.id} item={item} onStatusChange={updateMutation.mutate} />
                  ))}
                  {colItems.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-8">No items</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ========== LIST VIEW ========== */
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-3 font-medium text-gray-500">Type</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Account</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">LOB</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Urgency</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Due Date</th>
                <th className="text-left py-3 px-3 font-medium text-gray-500">Owner</th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                  <td className="py-2.5 px-3">
                    <span className="flex items-center gap-1.5">
                      {TYPE_ICONS[item.type]} <span className="text-xs">{item.type}</span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-medium">{item.account_name || '—'}</td>
                  <td className="py-2.5 px-3 text-gray-500">{item.policy_lob || '—'}</td>
                  <td className="py-2.5 px-3">
                    <select
                      className="text-xs border rounded px-1.5 py-1 bg-white"
                      value={item.status}
                      onChange={e => updateMutation.mutate({ id: item.id, data: { status: e.target.value } })}
                    >
                      {[...STATUS_COLUMNS, 'Completed', 'Closed'].map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`badge ${
                      item.urgency === 'Critical' ? 'badge-red' :
                      item.urgency === 'High' ? 'badge-orange' :
                      item.urgency === 'Medium' ? 'badge-yellow' : 'badge-gray'
                    }`}>{item.urgency}</span>
                  </td>
                  <td className={`py-2.5 px-3 text-xs ${dueDateColor(item.due_date)}`}>
                    {item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}
                  </td>
                  <td className="py-2.5 px-3 text-gray-500">{item.assignee_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 && (
            <p className="text-center py-12 text-gray-400">No service items match your filters</p>
          )}
        </div>
      )}
      {showCreate && <ServiceItemModal accountId="" policies={[]} onClose={() => setShowCreate(false)} />}
    </div>
  );
}
