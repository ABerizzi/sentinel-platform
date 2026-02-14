import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { prospectsApi, notesApi } from '../services/api';
import {
  Target, ArrowLeft, Phone, Mail, DollarSign, Calendar, UserPlus,
  ChevronRight, StickyNote, CheckCircle
} from 'lucide-react';
import NoteForm from '../components/common/NoteForm';
import CommLogForm from '../components/common/CommLogForm';
import toast from 'react-hot-toast';

const STAGES = [
  'New Lead', 'Contacted', 'Needs Analysis', 'Quoting', 'Proposal Sent', 'Negotiation',
  'Closed-Won', 'Closed-Lost',
];

const stageColors = {
  'New Lead': 'bg-gray-100 text-gray-700',
  'Contacted': 'bg-blue-100 text-blue-700',
  'Needs Analysis': 'bg-purple-100 text-purple-700',
  'Quoting': 'bg-yellow-100 text-yellow-700',
  'Proposal Sent': 'bg-orange-100 text-orange-700',
  'Negotiation': 'bg-green-100 text-green-700',
  'Closed-Won': 'bg-green-200 text-green-800',
  'Closed-Lost': 'bg-red-100 text-red-700',
};

export default function ProspectDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: prospect, isLoading } = useQuery({
    queryKey: ['prospect', id],
    queryFn: () => prospectsApi.get(id).then(r => r.data),
  });

  const { data: notes } = useQuery({
    queryKey: ['prospectNotes', id],
    queryFn: () => notesApi.list('Prospect', id).then(r => r.data),
    enabled: !!id,
  });

  const stageMutation = useMutation({
    mutationFn: (stage) => prospectsApi.updateStage(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prospect', id] });
      toast.success('Stage updated');
    },
  });

  const convertMutation = useMutation({
    mutationFn: () => prospectsApi.convert(id),
    onSuccess: (res) => {
      toast.success('Prospect converted to account!');
      navigate(`/accounts/${res.data.account_id}`);
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Conversion failed'),
  });

  const [showConvert, setShowConvert] = useState(false);

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sentinel-500" /></div>;
  }

  if (!prospect) {
    return <div className="card text-center py-12"><p className="text-gray-500">Prospect not found</p></div>;
  }

  const isClosed = prospect.pipeline_stage?.startsWith('Closed');
  const noteList = notes || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/pipeline" className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900">{prospect.first_name} {prospect.last_name}</h1>
            <span className={`badge ${stageColors[prospect.pipeline_stage] || 'badge-gray'}`}>{prospect.pipeline_stage}</span>
          </div>
          {prospect.business_name && <p className="text-gray-500 mt-1">{prospect.business_name}</p>}
        </div>
        {!isClosed && (
          <div className="flex items-center gap-2">
            {prospect.pipeline_stage !== 'Closed-Won' && (
              <button
                onClick={() => setShowConvert(true)}
                className="btn-primary flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" /> Convert to Account
              </button>
            )}
          </div>
        )}
        {prospect.converted_account_id && (
          <Link to={`/accounts/${prospect.converted_account_id}`} className="btn-primary flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4" /> View Account
          </Link>
        )}
      </div>

      {/* Stage pipeline visual */}
      {!isClosed && (
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-500 mb-3">PIPELINE STAGE</h3>
          <div className="flex gap-1">
            {STAGES.filter(s => !s.startsWith('Closed')).map((stage, i) => {
              const currentIdx = STAGES.findIndex(s => s === prospect.pipeline_stage);
              const stageIdx = i;
              const isActive = stageIdx <= currentIdx;
              return (
                <button
                  key={stage}
                  onClick={() => stageMutation.mutate(stage)}
                  className={`flex-1 py-2 px-1 text-xs font-medium rounded transition-colors ${
                    isActive ? 'bg-sentinel-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {stage}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => stageMutation.mutate('Closed-Won')}
              className="text-xs font-medium text-green-600 hover:text-green-700 border border-green-200 rounded px-3 py-1 hover:bg-green-50"
            >✓ Won</button>
            <button
              onClick={() => stageMutation.mutate('Closed-Lost')}
              className="text-xs font-medium text-red-600 hover:text-red-700 border border-red-200 rounded px-3 py-1 hover:bg-red-50"
            >✗ Lost</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h3 className="font-semibold mb-3">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-gray-400" />
                {prospect.phone ? (
                  <a href={`tel:${prospect.phone}`} className="text-sentinel-600 hover:text-sentinel-700">{prospect.phone}</a>
                ) : <span className="text-gray-400">No phone</span>}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-gray-400" />
                {prospect.email ? (
                  <a href={`mailto:${prospect.email}`} className="text-sentinel-600 hover:text-sentinel-700">{prospect.email}</a>
                ) : <span className="text-gray-400">No email</span>}
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3">Insurance Details</h3>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-gray-500">Line of Business</dt>
                <dd className="font-medium">{prospect.lob_interest || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Estimated Premium</dt>
                <dd className="font-medium text-green-600">{prospect.estimated_premium ? `$${Number(prospect.estimated_premium).toLocaleString()}` : '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Current Carrier</dt>
                <dd className="font-medium">{prospect.current_carrier || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Current Expiration</dt>
                <dd className="font-medium">{prospect.current_expiration ? new Date(prospect.current_expiration).toLocaleDateString() : '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Source</dt>
                <dd className="font-medium">{prospect.source || '—'} {prospect.source_detail ? `(${prospect.source_detail})` : ''}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Location</dt>
                <dd className="font-medium">{[prospect.zip_code, prospect.county].filter(Boolean).join(', ') || '—'}</dd>
              </div>
            </dl>
          </div>

          {/* Notes */}
          <div className="card">
            <div className="flex items-center gap-2 mb-3">
              <StickyNote className="w-5 h-5 text-sentinel-500" />
              <h3 className="font-semibold">Notes</h3>
            </div>
            <NoteForm entityType="Prospect" entityId={id} />
            <div className="space-y-2 mt-3">
              {noteList.map(n => (
                <div key={n.id} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-semibold mb-3">Activity Log</h3>
            <CommLogForm entityType="Prospect" entityId={id} />
          </div>

          <div className="card">
            <h3 className="font-semibold mb-3">Timeline</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between text-gray-500">
                <span>Created</span>
                <span>{new Date(prospect.created_at).toLocaleDateString()}</span>
              </div>
              {prospect.closed_at && (
                <div className="flex justify-between text-gray-500">
                  <span>Closed</span>
                  <span>{new Date(prospect.closed_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Convert confirmation */}
      {showConvert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setShowConvert(false)} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">Convert to Account?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will create a new account for <strong>{prospect.first_name} {prospect.last_name}</strong> and mark this prospect as Won.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowConvert(false)} className="btn-secondary">Cancel</button>
              <button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending} className="btn-primary">
                {convertMutation.isPending ? 'Converting...' : 'Convert'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
