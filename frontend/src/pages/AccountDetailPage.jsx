import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi, policiesApi, serviceBoardApi, tasksApi, notesApi, commLogsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Users, Phone, Mail, MapPin, FileText, ClipboardList, MessageSquare,
  StickyNote, Plus, ChevronDown, ChevronRight, Edit2, Check, X as XIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import ContactModal from '../components/common/ContactModal';
import NoteForm from '../components/common/NoteForm';
import CommLogForm from '../components/common/CommLogForm';
import ServiceItemModal from '../components/common/ServiceItemModal';
import TaskModal from '../components/common/TaskModal';
import PolicyModal from '../components/common/PolicyModal';

function Section({ title, icon: Icon, count, children, defaultOpen = true, actions }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full text-left">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-sentinel-500" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {count !== undefined && <span className="badge badge-gray">{count}</span>}
        </div>
        <div className="flex items-center gap-2">
          {actions && <div onClick={e => e.stopPropagation()}>{actions}</div>}
          {open ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </div>
  );
}

function daysColor(days) {
  if (days < 0) return 'text-gray-400';
  if (days <= 30) return 'text-red-600 font-semibold';
  if (days <= 60) return 'text-yellow-600';
  return 'text-green-600';
}

export default function AccountDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showContactModal, setShowContactModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});

  // Queries
  const { data: account, isLoading } = useQuery({
    queryKey: ['account', id],
    queryFn: () => accountsApi.get(id).then(r => r.data),
  });

  const { data: contacts } = useQuery({
    queryKey: ['accountContacts', id],
    queryFn: () => accountsApi.contacts(id).then(r => r.data),
    enabled: !!id,
  });

  const { data: policies } = useQuery({
    queryKey: ['accountPolicies', id],
    queryFn: () => policiesApi.list({ account_id: id, page_size: 100 }).then(r => r.data),
    enabled: !!id,
  });

  const { data: serviceItems } = useQuery({
    queryKey: ['accountServiceItems', id],
    queryFn: () => serviceBoardApi.list({ account_id: id }).then(r => r.data),
    enabled: !!id,
  });

  const { data: taskData } = useQuery({
    queryKey: ['accountTasks', id],
    queryFn: () => tasksApi.list({ linked_entity_type: 'Account', linked_entity_id: id }).then(r => r.data),
    enabled: !!id,
  });

  const { data: notes } = useQuery({
    queryKey: ['accountNotes', id],
    queryFn: () => notesApi.list('Account', id).then(r => r.data),
    enabled: !!id,
  });

  const { data: commLogs } = useQuery({
    queryKey: ['accountCommLogs', id],
    queryFn: () => commLogsApi.list('Account', id).then(r => r.data),
    enabled: !!id,
  });

  // Mutations
  const updateAccount = useMutation({
    mutationFn: (data) => accountsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['account', id] });
      setEditing(false);
      toast.success('Account updated');
    },
    onError: () => toast.error('Update failed'),
  });

  if (isLoading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sentinel-500" /></div>;
  }

  if (!account) {
    return <div className="card text-center py-12"><p className="text-gray-500">Account not found</p></div>;
  }

  const policyList = policies?.items || [];
  const siList = serviceItems?.items || [];
  const taskList = taskData?.items || [];
  const noteList = notes || [];
  const commList = commLogs || [];
  const contactList = contacts || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 truncate">{account.name}</h1>
              <span className={`badge ${account.type === 'Commercial' ? 'badge-purple' : 'badge-blue'}`}>{account.type}</span>
              <span className={`badge ${account.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>{account.status}</span>
            </div>

            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={editData.phone || ''} onChange={e => setEditData(d => ({ ...d, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input className="input" value={editData.email || ''} onChange={e => setEditData(d => ({ ...d, email: e.target.value }))} />
                </div>
                <div>
                  <label className="label">City</label>
                  <input className="input" value={editData.city || ''} onChange={e => setEditData(d => ({ ...d, city: e.target.value }))} />
                </div>
                <div>
                  <label className="label">State</label>
                  <input className="input" maxLength={2} value={editData.state || ''} onChange={e => setEditData(d => ({ ...d, state: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Zip</label>
                  <input className="input" value={editData.zip_code || ''} onChange={e => setEditData(d => ({ ...d, zip_code: e.target.value }))} />
                </div>
                <div>
                  <label className="label">County</label>
                  <input className="input" value={editData.county || ''} onChange={e => setEditData(d => ({ ...d, county: e.target.value }))} />
                </div>
                <div className="flex items-end gap-2">
                  <button className="btn-primary text-sm" onClick={() => updateAccount.mutate(editData)}>
                    <Check className="w-4 h-4" />
                  </button>
                  <button className="btn-secondary text-sm" onClick={() => setEditing(false)}>
                    <XIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-600">
                {account.phone && (
                  <a href={`tel:${account.phone}`} className="flex items-center gap-1.5 text-sentinel-600 hover:text-sentinel-700">
                    <Phone className="w-4 h-4" /> {account.phone}
                  </a>
                )}
                {account.email && (
                  <a href={`mailto:${account.email}`} className="flex items-center gap-1.5 text-sentinel-600 hover:text-sentinel-700">
                    <Mail className="w-4 h-4" /> {account.email}
                  </a>
                )}
                {(account.city || account.state) && (
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <MapPin className="w-4 h-4" />
                    {[account.city, account.state, account.zip_code].filter(Boolean).join(', ')}
                  </span>
                )}
                {account.county && <span className="text-gray-400">({account.county} County)</span>}
              </div>
            )}
          </div>
          {!editing && (
            <button
              onClick={() => { setEditing(true); setEditData({ phone: account.phone, email: account.email, city: account.city, state: account.state, zip_code: account.zip_code, county: account.county }); }}
              className="btn-secondary flex items-center gap-1.5 text-sm"
            >
              <Edit2 className="w-4 h-4" /> Edit
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column: Contacts + Policies */}
        <div className="lg:col-span-2 space-y-6">

          {/* Contacts */}
          <Section
            title="Contacts" icon={Users} count={contactList.length}
            actions={<button onClick={() => setShowContactModal(true)} className="p-1 text-sentinel-500 hover:bg-sentinel-50 rounded"><Plus className="w-4 h-4" /></button>}
          >
            {contactList.length === 0 ? (
              <p className="text-sm text-gray-400">No contacts yet</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {contactList.map(c => (
                  <div key={c.id} className="flex items-center justify-between py-2">
                    <div>
                      <p className="text-sm font-medium">
                        {c.first_name} {c.last_name}
                        {c.is_primary && <span className="badge badge-blue ml-2">Primary</span>}
                        {c.role && <span className="text-xs text-gray-400 ml-2">{c.role}</span>}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {c.email && <span className="text-xs text-gray-500">{c.email}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.phone && (
                        <a href={`tel:${c.phone}`} className="p-1.5 text-gray-400 hover:text-sentinel-500 rounded-lg hover:bg-gray-50" title="Call">
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      {c.email && (
                        <a href={`mailto:${c.email}`} className="p-1.5 text-gray-400 hover:text-sentinel-500 rounded-lg hover:bg-gray-50" title="Email">
                          <Mail className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Policies */}
          <Section
            title="Policies" icon={FileText} count={policyList.length}
            actions={<button onClick={() => setShowPolicyModal(true)} className="p-1 text-sentinel-500 hover:bg-sentinel-50 rounded"><Plus className="w-4 h-4" /></button>}
          >
            {policyList.length === 0 ? (
              <p className="text-sm text-gray-400">No policies</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-500">LOB</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Policy #</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Premium</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Expiration</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Status</th>
                      <th className="text-left py-2 px-2 font-medium text-gray-500">Renewal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policyList.map(p => {
                      const daysUntil = Math.ceil((new Date(p.expiration_date) - new Date()) / 86400000);
                      return (
                        <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-2 font-medium">
                            <Link to={`/policies/${p.id}`} className="text-sentinel-600 hover:text-sentinel-700">{p.line_of_business}</Link>
                          </td>
                          <td className="py-2 px-2 text-gray-500">{p.policy_number || '—'}</td>
                          <td className="py-2 px-2">{p.premium ? `$${Number(p.premium).toLocaleString()}` : '—'}</td>
                          <td className={`py-2 px-2 ${daysColor(daysUntil)}`}>
                            {new Date(p.expiration_date).toLocaleDateString()}
                            {p.status === 'Active' && daysUntil > 0 && <span className="text-xs ml-1">({daysUntil}d)</span>}
                          </td>
                          <td className="py-2 px-2">
                            <span className={`badge ${p.status === 'Active' ? 'badge-green' : 'badge-gray'}`}>{p.status}</span>
                          </td>
                          <td className="py-2 px-2">
                            <span className={`badge ${p.renewal_status === 'Bound' ? 'badge-green' : p.renewal_status === 'Not Started' ? 'badge-gray' : 'badge-blue'}`}>
                              {p.renewal_status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Service Items */}
          <Section
            title="Service Items" icon={ClipboardList} count={siList.length}
            actions={<button onClick={() => setShowServiceModal(true)} className="p-1 text-sentinel-500 hover:bg-sentinel-50 rounded"><Plus className="w-4 h-4" /></button>}
          >
            {siList.length === 0 ? (
              <p className="text-sm text-gray-400">No active service items</p>
            ) : (
              <div className="space-y-2">
                {siList.map(si => (
                  <div key={si.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className={`badge ${
                        si.type === 'NonRenewal' ? 'badge-red' :
                        si.type === 'UWIssue' ? 'badge-orange' :
                        si.type === 'Renewal' ? 'badge-blue' : 'badge-gray'
                      }`}>{si.type}</span>
                      <span className="text-sm">{si.description || si.policy_lob || '—'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`badge ${
                        si.urgency === 'Critical' ? 'badge-red' :
                        si.urgency === 'High' ? 'badge-orange' : 'badge-gray'
                      }`}>{si.urgency}</span>
                      <span className="text-xs text-gray-400">{si.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* Right column: Tasks, Notes, Activity */}
        <div className="space-y-6">

          {/* Tasks */}
          <Section
            title="Tasks" icon={ClipboardList} count={taskList.length} defaultOpen={true}
            actions={<button onClick={() => setShowTaskModal(true)} className="p-1 text-sentinel-500 hover:bg-sentinel-50 rounded"><Plus className="w-4 h-4" /></button>}
          >
            {taskList.length === 0 ? (
              <p className="text-sm text-gray-400">No open tasks</p>
            ) : (
              <div className="space-y-2">
                {taskList.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-1.5">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{t.title}</p>
                      <p className="text-xs text-gray-400">{t.due_date ? new Date(t.due_date).toLocaleDateString() : 'No date'}</p>
                    </div>
                    <span className={`badge ${t.priority === 'Urgent' ? 'badge-red' : t.priority === 'High' ? 'badge-orange' : 'badge-gray'}`}>
                      {t.priority}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Notes */}
          <Section title="Notes" icon={StickyNote} count={noteList.length}>
            <NoteForm entityType="Account" entityId={id} />
            <div className="space-y-3 mt-3">
              {noteList.map(n => (
                <div key={n.id} className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm whitespace-pre-wrap">{n.content}</p>
                  <p className="text-xs text-gray-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Communication Log */}
          <Section title="Activity" icon={MessageSquare} count={commList.length}>
            <CommLogForm entityType="Account" entityId={id} />
            <div className="space-y-2 mt-3">
              {commList.map(c => (
                <div key={c.id} className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
                  <div className={`mt-0.5 p-1 rounded ${c.direction === 'Outbound' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    {c.channel === 'Email' ? <Mail className="w-3 h-3" /> :
                     c.channel === 'Phone' ? <Phone className="w-3 h-3" /> :
                     <MessageSquare className="w-3 h-3" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{c.direction} {c.channel}</span>
                      <span className="text-xs text-gray-400">{new Date(c.logged_at).toLocaleString()}</span>
                    </div>
                    {c.subject && <p className="text-sm font-medium truncate">{c.subject}</p>}
                    {c.body_preview && <p className="text-xs text-gray-500 line-clamp-2">{c.body_preview}</p>}
                  </div>
                </div>
              ))}
              {commList.length === 0 && <p className="text-sm text-gray-400">No activity logged</p>}
            </div>
          </Section>
        </div>
      </div>

      {/* Modals */}
      {showContactModal && <ContactModal accountId={id} onClose={() => setShowContactModal(false)} />}
      {showServiceModal && <ServiceItemModal accountId={id} policies={policyList} onClose={() => setShowServiceModal(false)} />}
      {showTaskModal && <TaskModal entityType="Account" entityId={id} onClose={() => setShowTaskModal(false)} />}
      {showPolicyModal && <PolicyModal accountId={id} onClose={() => setShowPolicyModal(false)} />}
    </div>
  );
}
