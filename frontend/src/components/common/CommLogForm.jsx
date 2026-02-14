import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { commLogsApi } from '../../services/api';
import { Plus } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CommLogForm({ entityType, entityId }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    direction: 'Outbound',
    channel: 'Phone',
    subject: '',
    body_preview: '',
  });
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => commLogsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountCommLogs', entityId] });
      setForm({ direction: 'Outbound', channel: 'Phone', subject: '', body_preview: '' });
      setOpen(false);
      toast.success('Activity logged');
    },
    onError: () => toast.error('Failed to log activity'),
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      linked_entity_type: entityType,
      linked_entity_id: entityId,
    };
    if (!data.subject) delete data.subject;
    if (!data.body_preview) delete data.body_preview;
    mutation.mutate(data);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary text-sm w-full flex items-center justify-center gap-1.5">
        <Plus className="w-4 h-4" /> Log Activity
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-3 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label text-xs">Direction</label>
          <select className="input text-sm" value={form.direction} onChange={set('direction')}>
            <option value="Outbound">Outbound</option>
            <option value="Inbound">Inbound</option>
          </select>
        </div>
        <div>
          <label className="label text-xs">Channel</label>
          <select className="input text-sm" value={form.channel} onChange={set('channel')}>
            <option value="Phone">Phone</option>
            <option value="Email">Email</option>
            <option value="SMS">SMS</option>
            <option value="InPerson">In Person</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label text-xs">Subject</label>
        <input className="input text-sm" value={form.subject} onChange={set('subject')} placeholder="Brief subject..." />
      </div>
      <div>
        <label className="label text-xs">Notes</label>
        <textarea className="input text-sm" rows={2} value={form.body_preview} onChange={set('body_preview')} placeholder="Summary of conversation..." />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">Cancel</button>
        <button type="submit" disabled={mutation.isPending} className="btn-primary text-sm">
          {mutation.isPending ? 'Logging...' : 'Log'}
        </button>
      </div>
    </form>
  );
}
