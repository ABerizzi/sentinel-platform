import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { notesApi } from '../../services/api';
import { Send } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NoteForm({ entityType, entityId }) {
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data) => notesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`${entityType.toLowerCase()}Notes`, entityId] });
      queryClient.invalidateQueries({ queryKey: ['accountNotes', entityId] });
      setContent('');
      toast.success('Note added');
    },
    onError: () => toast.error('Failed to add note'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    mutation.mutate({
      content: content.trim(),
      linked_entity_type: entityType,
      linked_entity_id: entityId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        className="input flex-1"
        rows={2}
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="Add a note..."
      />
      <button
        type="submit"
        disabled={!content.trim() || mutation.isPending}
        className="btn-primary self-end px-3"
      >
        <Send className="w-4 h-4" />
      </button>
    </form>
  );
}
