import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policiesApi, notesApi, commLogsApi, serviceBoardApi } from '../services/api';
import {
  FileText, ArrowLeft, DollarSign, Calendar, Shield,
  Check, Clock, AlertTriangle, Plus, StickyNote, MessageSquare
} from 'lucide-react';
import NoteForm from '../components/common/NoteForm';
import CommLogForm from '../components/common/CommLogForm';
import toast from 'react-hot-toast';

function InstallmentRow({ inst, onMarkPaid }) {
  const isPastDue = inst.status !== 'Paid' && new Date(inst.due_date) < new Date();
  const statusIcons = {
    Paid: <Check className="w-4 h-4 text-green-500" />,
    Scheduled: <Clock className="w-4 h-4 text-gray-400" />,
    Reminded: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
    'Past Due': <AlertTriangle className="w-4 h-4 text-red-500" />,
  };

  return (
    <div className={`flex items-center justify-between py-3 px-3 rounded-lg ${
      inst.status === 'Paid' ? 'bg-green-50' :
      isPastDue ? 'bg-red-50' : 'bg-gray-50'
    }`}>
      <div className="flex items-center gap-3">
        {statusIcons[isPastDue && inst.status !== 'Paid' ? 'Past Due' : inst.status] || statusIcons.Scheduled}
        <div>
          <p className="text-sm font-medium">
            ${Number(inst.amount).toLocaleString()}
          </p>
          <p className="text-xs text-gray-500">
            Due: {new Date(inst.due_date).toLocaleDateString()}
            {inst.paid_date && <span className="text-green-600 ml-2">Paid: {new Date(inst.paid_date).toLocaleDateString()}</span>}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className={`badge ${
          inst.status === 'Paid' ? 'badge-green' :
          isPastDue ? 'badge-red' : 'badge-gray'
        }`}>
          {isPastDue && inst.status !== 'Paid' ? 'Past Due' : inst.status}
        </span>
        {inst.status !== 'Paid' && (
          <button onClick={() => onMarkPaid(inst.id)} className="text-xs text-sentinel-500 hover:text-sentinel-700 font-medium">
            Mark Paid
          </button>
        )}
      </div>
    </div>
  );
}

export default function PolicyDetailPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();

  const { data: policy, isLoading } = useQuery({
    queryKey: ['policy', id],
    queryFn: () => policiesApi.get(id).then(r => r.data),
  });

  const { data: installments } = useQuery({
    queryKey: ['policyInstallments', id],
    queryFn: () => policiesApi.installments(id).then(r => r.data),
    enabled: !!id,
  });

  const { data: serviceItems } = useQuery({
    queryKey: ['policyServiceItems', id],
    queryFn: () => serviceBoardApi.list({ policy_id: id }).then(r => r.data),
    enabled: !!id,
  });

  const { data: notes } = useQuery({
    queryKey: ['policyNotes', id],
    queryFn: () => notesApi.list('Policy', id).then(r => r.data),
    enabled: !!id,
  });

  const markPaidMutation = useMutation({
    mutationFn: (installmentId) => policiesApi.updateInstallment(installmentId, {
      status: 'Paid',
      paid_date: new Date().toISOString().split('T')[0],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policyInstallments', id] });
      toast.success('Installment marked as paid');
    },
  });

  const [showAddInstallment, setShowAddInstallment] = useState(false);
  const [instForm, setInstForm] = useState({ amount: '', due_date: '' });

  const addInstallmentMutation = useMutation({
    mutationFn: (data) => policiesApi.createInstallment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['policyInstallments', id] });
      setShowAddInstallment(false);
      setInstForm({ amount: '', due_date: '' });
      toast.success('Installment added');
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sentinel-500" /></div>;
  }

  if (!policy) {
    return <div className="card text-center py-12"><p className="text-gray-500">Policy not found</p></div>;
  }

  const daysUntilExp = Math.ceil((new Date(policy.expiration_date) - new Date()) / 86400000);
  const instList = installments || [];
  const paidCount = instList.filter(i => i.status === 'Paid').length;
  const totalPaid = instList.filter(i => i.status === 'Paid').reduce((s, i) => s + Number(i.amount), 0);
  const totalDue = instList.reduce((s, i) => s + Number(i.amount), 0);
  const siList = (serviceItems?.items || []);
  const noteList = notes || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => window.history.back()} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{policy.line_of_business}</h1>
            <span className={`badge ${policy.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>{policy.status}</span>
            <span className={`badge ${
              policy.renewal_status === 'Bound' ? 'badge-green' :
              policy.renewal_status === 'Not Started' ? 'badge-gray' : 'badge-blue'
            }`}>Renewal: {policy.renewal_status}</span>
          </div>
          {policy.policy_number && <p className="text-gray-500 mt-1">Policy # {policy.policy_number}</p>}
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card text-center">
          <DollarSign className="w-5 h-5 text-green-500 mx-auto" />
          <p className="text-2xl font-bold mt-1">{policy.premium ? `$${Number(policy.premium).toLocaleString()}` : '—'}</p>
          <p className="text-xs text-gray-500">Premium</p>
        </div>
        <div className="card text-center">
          <Calendar className="w-5 h-5 text-sentinel-500 mx-auto" />
          <p className="text-lg font-bold mt-1">{new Date(policy.effective_date).toLocaleDateString()}</p>
          <p className="text-xs text-gray-500">Effective Date</p>
        </div>
        <div className="card text-center">
          <Calendar className={`w-5 h-5 mx-auto ${daysUntilExp <= 30 ? 'text-red-500' : daysUntilExp <= 60 ? 'text-yellow-500' : 'text-green-500'}`} />
          <p className="text-lg font-bold mt-1">{new Date(policy.expiration_date).toLocaleDateString()}</p>
          <p className={`text-xs ${daysUntilExp <= 30 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
            {daysUntilExp > 0 ? `${daysUntilExp} days remaining` : 'Expired'}
          </p>
        </div>
        <div className="card text-center">
          <Shield className="w-5 h-5 text-sentinel-500 mx-auto" />
          <p className="text-lg font-bold mt-1">{policy.payment_plan || '—'}</p>
          <p className="text-xs text-gray-500">Payment Plan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Installment Schedule */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-sentinel-500" />
                <h3 className="font-semibold">Installments</h3>
                <span className="badge badge-gray">{paidCount}/{instList.length} paid</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">${totalPaid.toLocaleString()} / ${totalDue.toLocaleString()}</span>
                <button onClick={() => setShowAddInstallment(!showAddInstallment)} className="p-1 text-sentinel-500 hover:bg-sentinel-50 rounded">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Progress bar */}
            {totalDue > 0 && (
              <div className="h-2 bg-gray-200 rounded-full mb-4 overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${(totalPaid / totalDue) * 100}%` }} />
              </div>
            )}

            {showAddInstallment && (
              <div className="bg-gray-50 rounded-lg p-3 mb-3 flex items-end gap-3">
                <div className="flex-1">
                  <label className="label text-xs">Amount</label>
                  <input className="input" type="number" step="0.01" value={instForm.amount} onChange={e => setInstForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="flex-1">
                  <label className="label text-xs">Due Date</label>
                  <input className="input" type="date" value={instForm.due_date} onChange={e => setInstForm(f => ({ ...f, due_date: e.target.value }))} />
                </div>
                <button
                  onClick={() => addInstallmentMutation.mutate({ amount: parseFloat(instForm.amount), due_date: instForm.due_date })}
                  disabled={!instForm.amount || !instForm.due_date}
                  className="btn-primary text-sm"
                >Add</button>
              </div>
            )}

            <div className="space-y-2">
              {instList.map(inst => (
                <InstallmentRow key={inst.id} inst={inst} onMarkPaid={(iid) => markPaidMutation.mutate(iid)} />
              ))}
              {instList.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No installments</p>}
            </div>
          </div>

          {/* Service Items for this policy */}
          {siList.length > 0 && (
            <div className="card">
              <h3 className="font-semibold mb-3">Service Items</h3>
              <div className="space-y-2">
                {siList.map(si => (
                  <div key={si.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-blue">{si.type}</span>
                      <span className="text-sm">{si.description || '—'}</span>
                    </div>
                    <span className={`badge ${si.status === 'Completed' ? 'badge-green' : 'badge-gray'}`}>{si.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Policy details */}
          <div className="card">
            <h3 className="font-semibold mb-3">Details</h3>
            <dl className="space-y-2 text-sm">
              {policy.carrier_name && <div className="flex justify-between"><dt className="text-gray-500">Carrier</dt><dd className="font-medium">{policy.carrier_name}</dd></div>}
              {policy.policy_number && <div className="flex justify-between"><dt className="text-gray-500">Policy #</dt><dd className="font-medium">{policy.policy_number}</dd></div>}
              {policy.payment_plan && <div className="flex justify-between"><dt className="text-gray-500">Payment</dt><dd>{policy.payment_plan}</dd></div>}
              {policy.account_id && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Account</dt>
                  <dd><Link to={`/accounts/${policy.account_id}`} className="text-sentinel-500 hover:text-sentinel-600">View Account →</Link></dd>
                </div>
              )}
            </dl>
          </div>

          {/* Notes */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="w-5 h-5 text-sentinel-500" />
              <h3 className="font-semibold">Notes</h3>
            </div>
            <NoteForm entityType="Policy" entityId={id} />
            <div className="space-y-2 mt-3">
              {noteList.map(n => (
                <div key={n.id} className="bg-gray-50 rounded-lg p-2">
                  <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Comm log */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5 text-sentinel-500" />
              <h3 className="font-semibold">Activity</h3>
            </div>
            <CommLogForm entityType="Policy" entityId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
