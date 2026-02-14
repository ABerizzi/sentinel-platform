import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesLogApi, carriersApi, accountsApi } from '../../services/api';
import Modal from './Modal';
import toast from 'react-hot-toast';

const LOB_OPTIONS = [
  'Personal Auto', 'Homeowners', 'Renters', 'Condo', 'Umbrella', 'Flood',
  'Motorcycle', 'Boat', 'Landlord',
  'Business Owners Policy', 'Commercial General Liability', 'Commercial Auto',
  'Workers Compensation', 'Commercial Property', 'Professional Liability',
];

export default function SalesLogModal({ accountId: initialAccountId, onClose }) {
  const queryClient = useQueryClient();
  const [accountSearch, setAccountSearch] = useState('');

  const { data: carriers } = useQuery({
    queryKey: ['carriers'],
    queryFn: () => carriersApi.list().then(r => r.data),
  });

  const { data: searchResults } = useQuery({
    queryKey: ['accountSearch', accountSearch],
    queryFn: () => accountsApi.list({ search: accountSearch, page_size: 5 }).then(r => r.data),
    enabled: !initialAccountId && accountSearch.length >= 2,
  });

  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    date: today,
    account_id: initialAccountId || '',
    account_name: '',
    line_of_business: '',
    premium: '',
    carrier_id: '',
    source: '',
    source_detail: '',
    sale_type: 'New Business',
    zip_code: '',
    county: '',
    notes: '',
  });

  const mutation = useMutation({
    mutationFn: (data) => salesLogApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesList'] });
      queryClient.invalidateQueries({ queryKey: ['salesSummary'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Sale logged!');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed'),
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    delete data.account_name;
    data.premium = parseFloat(data.premium);
    if (!data.account_id) delete data.account_id;
    if (!data.carrier_id) delete data.carrier_id;
    if (!data.source) delete data.source;
    if (!data.source_detail) delete data.source_detail;
    if (!data.zip_code) delete data.zip_code;
    if (!data.county) delete data.county;
    if (!data.notes) delete data.notes;
    mutation.mutate(data);
  };

  return (
    <Modal title="Log Sale" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {!initialAccountId && (
          <div>
            <label className="label">Account</label>
            {form.account_id ? (
              <div className="flex items-center gap-2">
                <span className="input bg-gray-50 flex-1">{form.account_name}</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, account_id: '', account_name: '' }))} className="text-sm text-red-500">Change</button>
              </div>
            ) : (
              <div className="relative">
                <input className="input" placeholder="Search accounts..." value={accountSearch} onChange={e => setAccountSearch(e.target.value)} />
                {searchResults?.items?.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                    {searchResults.items.map(a => (
                      <button key={a.id} type="button" className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                        onClick={() => { setForm(f => ({ ...f, account_id: a.id, account_name: a.name })); setAccountSearch(''); }}>
                        {a.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Date *</label>
            <input className="input" type="date" required value={form.date} onChange={set('date')} />
          </div>
          <div>
            <label className="label">Sale Type *</label>
            <select className="input" required value={form.sale_type} onChange={set('sale_type')}>
              <option value="New Business">New Business</option>
              <option value="Rewrite">Rewrite</option>
              <option value="Cross-Sell">Cross-Sell</option>
              <option value="Renewal">Renewal</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Line of Business *</label>
            <select className="input" required value={form.line_of_business} onChange={set('line_of_business')}>
              <option value="">Select...</option>
              {LOB_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Premium *</label>
            <input className="input" type="number" step="0.01" required value={form.premium} onChange={set('premium')} placeholder="0.00" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Carrier</label>
            <select className="input" value={form.carrier_id} onChange={set('carrier_id')}>
              <option value="">Select...</option>
              {(carriers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Source</label>
            <select className="input" value={form.source} onChange={set('source')}>
              <option value="">Select...</option>
              <option value="Referral">Referral</option>
              <option value="Web">Web</option>
              <option value="Walk-in">Walk-in</option>
              <option value="Marketing">Marketing</option>
              <option value="Cross-Sell">Cross-Sell</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Zip Code</label>
            <input className="input" value={form.zip_code} onChange={set('zip_code')} placeholder="33301" />
          </div>
          <div>
            <label className="label">County</label>
            <input className="input" value={form.county} onChange={set('county')} placeholder="Broward" />
          </div>
        </div>

        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={set('notes')} placeholder="Optional notes..." />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Logging...' : 'Log Sale'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
