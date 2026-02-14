import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { policiesApi, carriersApi } from '../../services/api';
import Modal from './Modal';
import toast from 'react-hot-toast';

const LOB_OPTIONS = [
  'Personal Auto', 'Homeowners', 'Renters', 'Condo', 'Umbrella', 'Flood',
  'Motorcycle', 'Boat', 'RV', 'Landlord', 'Jewelry',
  'Business Owners Policy', 'Commercial General Liability', 'Commercial Auto',
  'Workers Compensation', 'Commercial Property', 'Professional Liability',
  'Cyber Liability', 'Commercial Umbrella', 'Inland Marine',
];

const PAYMENT_PLANS = ['Paid in Full', 'Monthly EFT', 'Monthly Direct Bill', 'Quarterly', 'Semi-Annual'];

export default function PolicyModal({ accountId, onClose }) {
  const queryClient = useQueryClient();

  const { data: carriers } = useQuery({
    queryKey: ['carriers'],
    queryFn: () => carriersApi.list().then(r => r.data),
  });

  const [form, setForm] = useState({
    account_id: accountId,
    carrier_id: '',
    line_of_business: '',
    policy_number: '',
    effective_date: '',
    expiration_date: '',
    premium: '',
    payment_plan: '',
    status: 'Active',
  });

  const mutation = useMutation({
    mutationFn: (data) => policiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountPolicies'] });
      queryClient.invalidateQueries({ queryKey: ['policies'] });
      toast.success('Policy added');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed'),
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  // Auto-set expiration to +1 year from effective
  const handleEffectiveChange = (e) => {
    const effDate = e.target.value;
    setForm(f => {
      const newForm = { ...f, effective_date: effDate };
      if (effDate && !f.expiration_date) {
        const d = new Date(effDate);
        d.setFullYear(d.getFullYear() + 1);
        newForm.expiration_date = d.toISOString().split('T')[0];
      }
      return newForm;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (data.premium) data.premium = parseFloat(data.premium);
    else delete data.premium;
    if (!data.carrier_id) delete data.carrier_id;
    if (!data.policy_number) delete data.policy_number;
    if (!data.payment_plan) delete data.payment_plan;
    mutation.mutate(data);
  };

  return (
    <Modal title="Add Policy" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Line of Business *</label>
            <select className="input" required value={form.line_of_business} onChange={set('line_of_business')}>
              <option value="">Select...</option>
              {LOB_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Carrier</label>
            <select className="input" value={form.carrier_id} onChange={set('carrier_id')}>
              <option value="">Select...</option>
              {(carriers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">Policy Number</label>
          <input className="input" value={form.policy_number} onChange={set('policy_number')} placeholder="e.g. 123456789" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Effective Date *</label>
            <input className="input" type="date" required value={form.effective_date} onChange={handleEffectiveChange} />
          </div>
          <div>
            <label className="label">Expiration Date *</label>
            <input className="input" type="date" required value={form.expiration_date} onChange={set('expiration_date')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Premium</label>
            <input className="input" type="number" step="0.01" value={form.premium} onChange={set('premium')} placeholder="0.00" />
          </div>
          <div>
            <label className="label">Payment Plan</label>
            <select className="input" value={form.payment_plan} onChange={set('payment_plan')}>
              <option value="">Select...</option>
              {PAYMENT_PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Adding...' : 'Add Policy'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
