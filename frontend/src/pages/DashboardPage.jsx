import { useQuery } from '@tanstack/react-query';
import { dashboardApi, salesLogApi } from '../services/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  CheckSquare, AlertTriangle, ClipboardList, DollarSign,
  Target, TrendingUp, Car, ArrowRight
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, color = 'sentinel', to }) {
  const colorMap = {
    sentinel: 'bg-sentinel-50 text-sentinel-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  const content = (
    <div className="card hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );

  return to ? <Link to={to}>{content}</Link> : content;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: dash, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get().then(r => r.data),
    refetchInterval: 60000,
  });

  const { data: salesSummary } = useQuery({
    queryKey: ['salesSummary'],
    queryFn: () => salesLogApi.summary().then(r => r.data),
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sentinel-500" />
      </div>
    );
  }

  const d = dash || {};
  const sales = salesSummary || {};
  const quota = sales.allstate_quota || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 mt-1">Here's what needs your attention today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={CheckSquare}
          label="Tasks Due Today"
          value={d.tasks_due_today || 0}
          sub={d.tasks_overdue ? `${d.tasks_overdue} overdue` : null}
          color={d.tasks_overdue > 0 ? 'red' : 'sentinel'}
        />
        <StatCard
          icon={ClipboardList}
          label="Service Items Due"
          value={d.service_items_due_this_week || 0}
          sub={d.service_items_overdue ? `${d.service_items_overdue} overdue` : 'This week'}
          color={d.service_items_overdue > 0 ? 'red' : 'sentinel'}
          to="/service-board"
        />
        <StatCard
          icon={DollarSign}
          label="Installments Due"
          value={d.installments_due_this_week || 0}
          sub={d.installments_past_due ? `${d.installments_past_due} past due` : 'This week'}
          color={d.installments_past_due > 0 ? 'yellow' : 'green'}
        />
        <StatCard
          icon={Target}
          label="Pipeline"
          value={d.pipeline_count || 0}
          sub={`$${Number(d.pipeline_value || 0).toLocaleString()} est. premium`}
          color="purple"
          to="/pipeline"
        />
      </div>

      {/* Sales & Quota row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Sales This Month</h3>
            <Link to="/sales-log" className="text-sm text-sentinel-500 hover:text-sentinel-600 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-3xl font-bold">{sales.this_month?.count || 0}</p>
              <p className="text-xs text-gray-500">policies written</p>
            </div>
            <div>
              <p className="text-3xl font-bold">${Number(sales.this_month?.premium || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500">total premium</p>
            </div>
          </div>
        </div>

        {/* Allstate Quota Tracker */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Car className="w-5 h-5 text-sentinel-500" />
            <h3 className="font-semibold text-gray-900">Allstate Auto Quota</h3>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-4xl font-bold">
                {quota.auto_items_this_month || 0}
                <span className="text-lg text-gray-400 font-normal"> / 13</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {quota.remaining || 13} remaining
              </p>
            </div>
            <div className="flex-1">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    (quota.auto_items_this_month || 0) >= 13 ? 'bg-green-500' :
                    quota.on_track ? 'bg-sentinel-500' : 'bg-yellow-500'
                  }`}
                  style={{ width: `${Math.min(100, ((quota.auto_items_this_month || 0) / 13) * 100)}%` }}
                />
              </div>
              <p className={`text-xs mt-1 ${quota.on_track ? 'text-green-600' : 'text-yellow-600'}`}>
                {quota.on_track ? '✓ On track' : '⚠ Behind pace'}
              </p>
            </div>
          </div>
        </div>

        {/* YTD Summary */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Year to Date</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-3xl font-bold">{sales.ytd?.count || 0}</p>
              <p className="text-xs text-gray-500">policies written</p>
            </div>
            <div>
              <p className="text-3xl font-bold">${Number(sales.ytd?.premium || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500">total premium</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tasks and Service Items lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Upcoming Tasks</h3>
          </div>
          <div className="space-y-2">
            {(d.recent_tasks || []).length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">No open tasks</p>
            )}
            {(d.recent_tasks || []).map(task => (
              <div key={task.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-gray-400">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
                  </p>
                </div>
                <span className={`badge ${
                  task.priority === 'Urgent' ? 'badge-red' :
                  task.priority === 'High' ? 'badge-orange' :
                  'badge-gray'
                }`}>
                  {task.priority}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Service Items */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Active Service Items</h3>
            <Link to="/service-board" className="text-sm text-sentinel-500 hover:text-sentinel-600 flex items-center gap-1">
              Service Board <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {(d.recent_service_items || []).length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">No active service items</p>
            )}
            {(d.recent_service_items || []).map(item => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`badge ${
                      item.type === 'NonRenewal' ? 'badge-red' :
                      item.type === 'UWIssue' ? 'badge-orange' :
                      item.type === 'Renewal' ? 'badge-blue' :
                      'badge-gray'
                    }`}>
                      {item.type}
                    </span>
                    <p className="text-sm font-medium truncate">{item.description || 'No description'}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Due: {item.due_date ? new Date(item.due_date).toLocaleDateString() : 'No date'}
                  </p>
                </div>
                <span className={`badge ${
                  item.urgency === 'Critical' ? 'badge-red' :
                  item.urgency === 'High' ? 'badge-orange' :
                  'badge-gray'
                }`}>
                  {item.urgency}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
