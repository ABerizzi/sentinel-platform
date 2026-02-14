import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../services/api';
import { CheckSquare, Plus, Check } from 'lucide-react';
import TaskModal from '../components/common/TaskModal';
import toast from 'react-hot-toast';

function priorityBadge(p) {
  const map = { Urgent: 'badge-red', High: 'badge-orange', Medium: 'badge-yellow', Low: 'badge-gray' };
  return map[p] || 'badge-gray';
}

function dueDateColor(d) {
  if (!d) return 'text-gray-400';
  const days = Math.ceil((new Date(d) - new Date()) / 86400000);
  if (days < 0) return 'text-red-600 font-semibold';
  if (days === 0) return 'text-red-500';
  if (days <= 3) return 'text-yellow-600';
  return 'text-gray-600';
}

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['allTasks', statusFilter, priorityFilter],
    queryFn: () => tasksApi.my({
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
    }).then(r => r.data),
  });

  const completeMutation = useMutation({
    mutationFn: (id) => tasksApi.update(id, { status: 'Completed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allTasks'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Task completed');
    },
  });

  const tasks = data?.items || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare className="w-7 h-7 text-sentinel-500" /> My Tasks
          </h1>
          <p className="text-sm text-gray-500 mt-1">{tasks.length} tasks</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">Active Tasks</option>
          <option value="Open">Open</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
        <select className="input w-auto" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
          <option value="">All Priorities</option>
          <option value="Urgent">Urgent</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sentinel-500" /></div>
      ) : (
        <div className="card">
          <div className="space-y-1">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-gray-50 group">
                <button
                  onClick={() => completeMutation.mutate(task.id)}
                  className="flex-shrink-0 w-6 h-6 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 flex items-center justify-center transition-colors group-hover:border-green-400"
                  title="Complete"
                >
                  <Check className="w-3.5 h-3.5 text-transparent group-hover:text-green-500 transition-colors" />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  {task.description && <p className="text-xs text-gray-500 truncate mt-0.5">{task.description}</p>}
                </div>
                <span className={`badge ${priorityBadge(task.priority)}`}>{task.priority}</span>
                <span className={`text-xs ${dueDateColor(task.due_date)}`}>
                  {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No date'}
                </span>
                <span className="badge badge-gray text-xs">{task.status}</span>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-center py-12 text-gray-400">
                {statusFilter === 'Completed' ? 'No completed tasks found' : 'No open tasks — nice work!'}
              </p>
            )}
          </div>
        </div>
      )}

      {showModal && <TaskModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
