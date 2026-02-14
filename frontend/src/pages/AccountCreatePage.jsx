import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { accountsApi } from '../services/api';
import { Users, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function AccountCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    type: 'Personal',
    status: 'Active',
    phone: '',
    email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: 'FL',
    zip_code: '',
    county: '',
  });

  const mutation = useMutation({
    mutationFn: (data) => accountsApi.create(data),
    onSuccess: (res) => {
      toast.success('Account created');
      navigate(`/accounts/${res.data.id}`);
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed to create account'),
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    // Clean empty strings
    Object.keys(data).forEach(k => { if (data[k] === '') delete data[k]; });
    // name and type are required
    data.name = form.name;
    data.type = form.type;
    mutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/accounts" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-sentinel-500" /> New Account
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Basic Info */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Account Name *</label>
              <input className="input" required value={form.name} onChange={set('name')} placeholder="e.g. John Smith or Smith Plumbing LLC" />
            </div>
            <div>
              <label className="label">Type *</label>
              <select className="input" value={form.type} onChange={set('type')}>
                <option value="Personal">Personal</option>
                <option value="Commercial">Commercial</option>
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={set('status')}>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Prospect">Prospect</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={set('phone')} placeholder="(954) 555-1234" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} placeholder="client@email.com" />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Address Line 1</label>
              <input className="input" value={form.address_line1} onChange={set('address_line1')} placeholder="123 Main St" />
            </div>
            <div className="md:col-span-2">
              <label className="label">Address Line 2</label>
              <input className="input" value={form.address_line2} onChange={set('address_line2')} placeholder="Apt, Suite, etc." />
            </div>
            <div>
              <label className="label">City</label>
              <input className="input" value={form.city} onChange={set('city')} placeholder="Fort Lauderdale" />
            </div>
            <div>
              <label className="label">State</label>
              <input className="input" maxLength={2} value={form.state} onChange={set('state')} placeholder="FL" />
            </div>
            <div>
              <label className="label">Zip Code</label>
              <input className="input" value={form.zip_code} onChange={set('zip_code')} placeholder="33301" />
            </div>
            <div>
              <label className="label">County</label>
              <input className="input" value={form.county} onChange={set('county')} placeholder="Broward" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Link to="/accounts" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Creating...' : 'Create Account'}
          </button>
        </div>
      </form>
    </div>
  );
}
