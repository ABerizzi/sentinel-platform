import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { serviceBoardApi, accountsApi } from '../../services/api';
import Modal from './Modal';
import toast from 'react-hot-toast';

const SERVICE_TYPES = [
  { value: 'Renewal', label: '🔄 Renewal' },
  { value: 'MidTermReview', label: '📋 Mid-Term Review' },
  { value: 'Rewrite', label: '📝 Rewrite' },
  { value: 'Endorsement', label: '✏️ Endorsement' },
  { value: 'UWIssue', label: '⚠️ UW Issue' },
  { value: 'NonRenewal', label: '🚫 Non-Renewal' },
  { value: 'PaymentIssue', label: '💳 Payment Issue' },
  { value: 'General', label: '📌 General' },
];

export default function ServiceItemModal({ accountId: initialAccountId, policies = [], onClose }) {
  const queryClient = useQueryClient();
  const [accountSearch, setAccountSearch] = useState('');

  const { data: searchResults } = useQuery({
    queryKey: ['accountSearch', accountSearch],
    queryFn: () => accountsApi.list({ search: accountSearch, page_size: 5 }).then(r => r.data),
    enabled: !initialAccountId && accountSearch.length >= 2,
  });

  const [form, setForm] = useState({
    type: 'General',
    account_id: initialAccountId || '',
    account_name: '',
    policy_id: '',
    description: '',
    due_date: '',
    urgency: 'Medium',
  });

  const mutation = useMutation({
    mutationFn: (data) => serviceBoardApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountServiceItems'] });
      queryClient.invalidateQueries({ queryKey: ['serviceBoard'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Service item created');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed'),
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    delete data.account_name;
    if (!data.account_id) delete data.account_id;
    if (!data.policy_id) delete data.policy_id;
    if (!data.due_date) delete data.due_date;
    mutation.mutate(data);
  };

  return (
    <Modal title="New Service Item" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!initialAccountId && (
          <div>
            <label className="label">Account *</label>
            {form.account_id ? (
              <div className="flex items-center gap-2">
                <span className="input bg-gray-50 flex-1">{form.account_name}</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, account_id: '', account_name: '' }))} className="text-sm text-red-500">Change</button>
              </div>
            ) : (
              <div className="relative">
                <input
                  className="input"
                  placeholder="Search accounts..."
                  value={accountSearch}
                  onChange={e => setAccountSearch(e.target.value)}
                />
                {searchResults?.items?.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                    {searchResults.items.map(a => (
                      <button
                        key={a.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        onClick={() => {
                          setForm(f => ({ ...f, account_id: a.id, account_name: a.name }));
                          setAccountSearch('');
                        }}
                      >
                        {a.name} <span className="text-gray-400">({a.type})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="label">Type *</label>
          <select className="input" value={form.type} onChange={set('type')} required>
            {SERVICE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {policies.length > 0 && (
          <div>
            <label className="label">Policy</label>
            <select className="input" value={form.policy_id} onChange={set('policy_id')}>
              <option value="">None / General</option>
              {policies.map(p => (
                <option key={p.id} value={p.id}>
                  {p.line_of_business} — {p.policy_number || 'No #'} (exp {new Date(p.expiration_date).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={3} value={form.description} onChange={set('description')} placeholder="What needs to be done?" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Due Date</label>
            <input className="input" type="date" value={form.due_date} onChange={set('due_date')} />
          </div>
          <div>
            <label className="label">Urgency</label>
            <select className="input" value={form.urgency} onChange={set('urgency')}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Creating...' : 'Create Service Item'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
