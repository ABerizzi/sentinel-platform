import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsApi } from '../../services/api';
import Modal from './Modal';
import toast from 'react-hot-toast';

export default function ContactModal({ accountId, contact, onClose }) {
  const queryClient = useQueryClient();
  const isEdit = !!contact;

  const [form, setForm] = useState({
    first_name: contact?.first_name || '',
    last_name: contact?.last_name || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    mobile_phone: contact?.mobile_phone || '',
    role: contact?.role || '',
    is_primary: contact?.is_primary || false,
    communication_preference: contact?.communication_preference || '',
    date_of_birth: contact?.date_of_birth || '',
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? contactsApi.update(contact.id, data)
      : contactsApi.create({ ...data, account_id: accountId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountContacts', accountId] });
      toast.success(isEdit ? 'Contact updated' : 'Contact added');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed'),
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (!data.email) delete data.email;
    if (!data.phone) delete data.phone;
    if (!data.mobile_phone) delete data.mobile_phone;
    if (!data.role) delete data.role;
    if (!data.communication_preference) delete data.communication_preference;
    if (!data.date_of_birth) delete data.date_of_birth;
    mutation.mutate(data);
  };

  return (
    <Modal title={isEdit ? 'Edit Contact' : 'Add Contact'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First Name *</label>
            <input className="input" required value={form.first_name} onChange={set('first_name')} />
          </div>
          <div>
            <label className="label">Last Name *</label>
            <input className="input" required value={form.last_name} onChange={set('last_name')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={set('phone')} placeholder="(555) 123-4567" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Mobile</label>
            <input className="input" value={form.mobile_phone} onChange={set('mobile_phone')} />
          </div>
          <div>
            <label className="label">Role / Title</label>
            <input className="input" value={form.role} onChange={set('role')} placeholder="e.g. Owner, Spouse, Manager" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Communication Preference</label>
            <select className="input" value={form.communication_preference} onChange={set('communication_preference')}>
              <option value="">Not set</option>
              <option value="Email">Email</option>
              <option value="Phone">Phone</option>
              <option value="Text">Text</option>
            </select>
          </div>
          <div>
            <label className="label">Date of Birth</label>
            <input className="input" type="date" value={form.date_of_birth} onChange={set('date_of_birth')} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input type="checkbox" id="is_primary" checked={form.is_primary} onChange={set('is_primary')} className="rounded border-gray-300 text-sentinel-500 focus:ring-sentinel-500" />
          <label htmlFor="is_primary" className="text-sm text-gray-700">Primary contact</label>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Saving...' : isEdit ? 'Update Contact' : 'Add Contact'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
