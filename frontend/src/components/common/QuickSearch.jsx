import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { accountsApi, prospectsApi } from '../../services/api';
import { Search, User, Target, X } from 'lucide-react';

export default function QuickSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  const { data: accounts } = useQuery({
    queryKey: ['quickSearchAccounts', query],
    queryFn: () => accountsApi.list({ search: query, page_size: 5 }).then(r => r.data),
    enabled: query.length >= 2,
  });

  const { data: prospects } = useQuery({
    queryKey: ['quickSearchProspects', query],
    queryFn: () => prospectsApi.list({ search: query, page_size: 5 }).then(r => r.data),
    enabled: query.length >= 2,
  });

  // Keyboard shortcut: Ctrl/Cmd + K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  const goTo = (path) => {
    navigate(path);
    setOpen(false);
    setQuery('');
  };

  const acctResults = accounts?.items || [];
  const prospResults = prospects?.items || [];
  const hasResults = acctResults.length > 0 || prospResults.length > 0;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 w-full text-left text-sentinel-400 hover:text-white hover:bg-sentinel-700/50 rounded-lg transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="text-sm">Search...</span>
        <kbd className="ml-auto text-xs bg-sentinel-700 px-1.5 py-0.5 rounded">⌘K</kbd>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
      <div className="fixed inset-0 bg-black/50" onClick={() => { setOpen(false); setQuery(''); }} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 text-base outline-none placeholder:text-gray-400"
            placeholder="Search accounts, prospects..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <button onClick={() => { setOpen(false); setQuery(''); }} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {query.length >= 2 && (
          <div className="max-h-80 overflow-y-auto">
            {!hasResults && (
              <p className="text-sm text-gray-400 text-center py-8">No results for "{query}"</p>
            )}

            {acctResults.length > 0 && (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50">Accounts</p>
                {acctResults.map(a => (
                  <button
                    key={a.id}
                    onClick={() => goTo(`/accounts/${a.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-sentinel-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-sentinel-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.name}</p>
                      <p className="text-xs text-gray-400">{a.type} · {a.phone || a.email || a.city || ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {prospResults.length > 0 && (
              <div>
                <p className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50">Prospects</p>
                {prospResults.map(p => (
                  <button
                    key={p.id}
                    onClick={() => goTo(`/prospects/${p.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-sentinel-50 transition-colors"
                  >
                    <Target className="w-4 h-4 text-purple-500" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{p.first_name} {p.last_name}</p>
                      <p className="text-xs text-gray-400">{p.pipeline_stage} · {p.lob_interest || ''}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {query.length < 2 && (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-400">Type at least 2 characters to search</p>
          </div>
        )}
      </div>
    </div>
  );
}
