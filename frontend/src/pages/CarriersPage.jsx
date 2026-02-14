import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { carriersApi } from '../services/api';
import { Building2, ExternalLink, Plus } from 'lucide-react';
import CarrierModal from '../components/common/CarrierModal';

export default function CarriersPage() {
  const [showModal, setShowModal] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['carriers'],
    queryFn: () => carriersApi.list().then(r => r.data),
  });

  const carriers = data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-sentinel-500" /> Carriers
          </h1>
          <p className="text-sm text-gray-500 mt-1">{carriers.length} carriers</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Carrier
        </button>
      </div>

      {showModal && <CarrierModal onClose={() => setShowModal(false)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {carriers.map(c => (
          <div key={c.id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{c.name}</h3>
                <span className={`badge mt-1 ${c.type === 'Direct' ? 'badge-blue' : c.type === 'MGA' ? 'badge-purple' : 'badge-gray'}`}>
                  {c.type}
                </span>
              </div>
              {c.am_best_rating && (
                <span className="text-sm font-medium text-gray-500">AM Best: {c.am_best_rating}</span>
              )}
            </div>
            {c.appetite_notes && (
              <p className="text-xs text-gray-500 mt-3 line-clamp-2">{c.appetite_notes}</p>
            )}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
              {c.phone && <a href={`tel:${c.phone}`} className="text-xs text-sentinel-500">{c.phone}</a>}
              {c.portal_url && (
                <a href={c.portal_url} target="_blank" rel="noopener" className="text-xs text-sentinel-500 flex items-center gap-1">
                  Portal <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
