import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prospectsApi } from '../services/api';
import { Target, Phone, Mail, DollarSign, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

const STAGES = [
  'New Lead', 'Contacted', 'Needs Analysis', 'Quoting', 'Proposal Sent', 'Negotiation',
];

const stageColors = {
  'New Lead': 'border-t-gray-400',
  'Contacted': 'border-t-blue-400',
  'Needs Analysis': 'border-t-purple-400',
  'Quoting': 'border-t-yellow-400',
  'Proposal Sent': 'border-t-orange-400',
  'Negotiation': 'border-t-green-400',
};

export default function PipelinePage() {
  const queryClient = useQueryClient();

  const { data: prospects } = useQuery({
    queryKey: ['prospects', { page_size: 200 }],
    queryFn: () => prospectsApi.list({ page_size: 200 }).then(r => r.data),
  });

  const { data: pipelineStats } = useQuery({
    queryKey: ['pipelineStats'],
    queryFn: () => prospectsApi.pipeline().then(r => r.data),
  });

  const stageMutation = useMutation({
    mutationFn: ({ id, stage }) => prospectsApi.updateStage(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.invalidateQueries({ queryKey: ['pipelineStats'] });
    },
  });

  const items = prospects?.items || [];
  const stats = pipelineStats || {};

  const totalValue = Object.values(stats).reduce((sum, s) => sum + (s.value || 0), 0);
  const totalCount = Object.values(stats).reduce((sum, s) => sum + (s.count || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Target className="w-7 h-7 text-sentinel-500" />
            Sales Pipeline
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {totalCount} prospects &middot; ${totalValue.toLocaleString()} est. premium
          </p>
        </div>
        <Link to="/prospects/new" className="btn-primary flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Prospect
        </Link>
      </div>

      {/* Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
        {STAGES.map(stage => {
          const stageItems = items.filter(p => p.pipeline_stage === stage);
          const stageStats = stats[stage] || { count: 0, value: 0 };

          return (
            <div key={stage} className="flex-shrink-0 w-72">
              <div className={`border-t-4 ${stageColors[stage]} rounded-t-lg`}>
                <div className="flex items-center justify-between px-3 py-2">
                  <h3 className="text-sm font-semibold text-gray-700">{stage}</h3>
                  <div className="text-right">
                    <span className="badge badge-gray text-xs">{stageStats.count}</span>
                    <p className="text-xs text-gray-400">${stageStats.value.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2 min-h-[200px] bg-gray-50 rounded-b-lg p-2">
                {stageItems.map(prospect => (
                  <div key={prospect.id} className="bg-white rounded-lg shadow-sm p-3 hover:shadow-md transition-shadow">
                    <Link to={`/prospects/${prospect.id}`} className="text-sm font-medium text-gray-900 hover:text-sentinel-600">
                      {prospect.first_name} {prospect.last_name}
                    </Link>
                    {prospect.business_name && (
                      <p className="text-xs text-gray-500">{prospect.business_name}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      {prospect.lob_interest && (
                        <span className="badge badge-blue">{prospect.lob_interest}</span>
                      )}
                      {prospect.estimated_premium && (
                        <span className="text-xs text-green-600 flex items-center gap-0.5">
                          <DollarSign className="w-3 h-3" />
                          {Number(prospect.estimated_premium).toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
                      {prospect.phone && (
                        <a href={`tel:${prospect.phone}`} className="text-gray-400 hover:text-sentinel-500">
                          <Phone className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {prospect.email && (
                        <a href={`mailto:${prospect.email}`} className="text-gray-400 hover:text-sentinel-500">
                          <Mail className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {prospect.source && (
                        <span className="text-xs text-gray-400 ml-auto">{prospect.source}</span>
                      )}
                    </div>
                  </div>
                ))}
                {stageItems.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-8">No prospects</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
