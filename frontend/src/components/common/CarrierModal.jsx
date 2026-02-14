import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { carriersApi } from '../../services/api';
import Modal from './Modal';
import toast from 'react-hot-toast';

export default function CarrierModal({ onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    type: 'Direct',
    phone: '',
    email: '',
    portal_url: '',
    appetite_notes: '',
    am_best_rating: '',
  });

  const mutation = useMutation({
    mutationFn: (data) => carriersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
      toast.success('Carrier added');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed'),
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    Object.keys(data).forEach(k => { if (data[k] === '') delete data[k]; });
    data.name = form.name;
    data.type = form.type;
    mutation.mutate(data);
  };

  return (
    <Modal title="Add Carrier" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="label">Carrier Name *</label>
            <input className="input" required value={form.name} onChange={set('name')} placeholder="e.g. Allstate, Citizens, Heritage" />
          </div>
          <div>
            <label className="label">Type *</label>
            <select className="input" value={form.type} onChange={set('type')}>
              <option value="Direct">Direct</option>
              <option value="Wholesaler">Wholesaler</option>
              <option value="MGA">MGA</option>
            </select>
          </div>
          <div>
            <label className="label">AM Best Rating</label>
            <input className="input" value={form.am_best_rating} onChange={set('am_best_rating')} placeholder="e.g. A+" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} />
          </div>
        </div>

        <div>
          <label className="label">Portal URL</label>
          <input className="input" value={form.portal_url} onChange={set('portal_url')} placeholder="https://..." />
        </div>

        <div>
          <label className="label">Appetite Notes</label>
          <textarea className="input" rows={3} value={form.appetite_notes} onChange={set('appetite_notes')} placeholder="What do they write? Any restrictions?" />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Adding...' : 'Add Carrier'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
