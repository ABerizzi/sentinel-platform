import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../services/api';
import Modal from './Modal';
import toast from 'react-hot-toast';

export default function TaskModal({ entityType, entityId, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    description: '',
    due_date: '',
    priority: 'Medium',
  });

  const mutation = useMutation({
    mutationFn: (data) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accountTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task created');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Failed'),
  });

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      linked_entity_type: entityType || undefined,
      linked_entity_id: entityId || undefined,
    };
    if (!data.description) delete data.description;
    if (!data.due_date) delete data.due_date;
    mutation.mutate(data);
  };

  return (
    <Modal title="New Task" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Title *</label>
          <input className="input" required value={form.title} onChange={set('title')} placeholder="What needs to be done?" />
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={3} value={form.description} onChange={set('description')} placeholder="Additional details..." />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Due Date</label>
            <input className="input" type="date" value={form.due_date} onChange={set('due_date')} />
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={set('priority')}>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Urgent">Urgent</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="btn-primary">
            {mutation.isPending ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
