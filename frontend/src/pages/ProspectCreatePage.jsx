import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { prospectsApi } from '../services/api';
import { Target, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const LOB_OPTIONS = [
  'Personal Auto', 'Homeowners', 'Renters', 'Condo', 'Umbrella', 'Flood',
  'Motorcycle', 'Boat', 'RV', 'Landlord', 'Jewelry',
  'Business Owners Policy', 'Commercial General Liability', 'Commercial Auto',
  'Workers Compensation', 'Commercial Property', 'Professional Liability',
  'Cyber Liability', 'Commercial Umbrella',
];

export default function ProspectCreatePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    business_name: '',
    email: '',
    phone: '',
    source: '',
    source_detail: '',
    lob_interest: '',
    estimated_premium: '',
    current_carrier: '',
    current_expiration: '',
    zip_code: '',
    county: '',
  });

  const mutation = useMutation({
    mutationFn: (data) => prospectsApi.create(data),
    onSuccess: () => {
      toast.success('Prospect added to pipeline');
      navigate('/pipeline');
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed'),
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    Object.keys(data).forEach(k => { if (data[k] === '') delete data[k]; });
    data.first_name = form.first_name;
    data.last_name = form.last_name;
    if (data.estimated_premium) data.estimated_premium = parseFloat(data.estimated_premium);
    mutation.mutate(data);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/pipeline" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Target className="w-7 h-7 text-sentinel-500" /> New Prospect
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        {/* Contact */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">First Name *</label>
              <input className="input" required value={form.first_name} onChange={set('first_name')} />
            </div>
            <div>
              <label className="label">Last Name *</label>
              <input className="input" required value={form.last_name} onChange={set('last_name')} />
            </div>
            <div className="md:col-span-2">
              <label className="label">Business Name</label>
              <input className="input" value={form.business_name} onChange={set('business_name')} placeholder="Leave blank for personal lines" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={set('phone')} placeholder="(954) 555-1234" />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={form.email} onChange={set('email')} />
            </div>
          </div>
        </div>

        {/* Insurance */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Insurance Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Line of Business Interest</label>
              <select className="input" value={form.lob_interest} onChange={set('lob_interest')}>
                <option value="">Select...</option>
                {LOB_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Estimated Premium</label>
              <input className="input" type="number" step="0.01" value={form.estimated_premium} onChange={set('estimated_premium')} placeholder="0.00" />
            </div>
            <div>
              <label className="label">Current Carrier</label>
              <input className="input" value={form.current_carrier} onChange={set('current_carrier')} placeholder="e.g. State Farm, GEICO..." />
            </div>
            <div>
              <label className="label">Current Expiration</label>
              <input className="input" type="date" value={form.current_expiration} onChange={set('current_expiration')} />
            </div>
          </div>
        </div>

        {/* Source & Location */}
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Source & Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="label">Source Detail</label>
              <input className="input" value={form.source_detail} onChange={set('source_detail')} placeholder="e.g. referred by John Smith" />
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
          <Link to="/pipeline" className="btn-secondary">Cancel</Link>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Adding...' : 'Add to Pipeline'}
          </button>
        </div>
      </form>
    </div>
  );
}
