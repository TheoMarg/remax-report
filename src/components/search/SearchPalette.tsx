import { useState, useEffect, useRef, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAgents } from '../../hooks/useAgents';
import { useModal360 } from '../../contexts/Modal360Context';
import { supabase } from '../../lib/supabase';
import type { Agent } from '../../lib/types';

interface PropertyResult {
  property_id: string;
  property_code: string | null;
  address: string | null;
  area: string | null;
  transaction_type: string | null;
  price: number | null;
  is_retired: boolean | null;
}

export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const [properties, setProperties] = useState<PropertyResult[]>([]);
  const [loadingProps, setLoadingProps] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const { data: agents = [] } = useAgents();
  const { openAgent, openProperty } = useModal360();

  // Ctrl+K / Cmd+K toggle + custom event from header button
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    const onOpenEvent = () => setOpen(true);
    document.addEventListener('keydown', onKey);
    document.addEventListener('open-search-palette', onOpenEvent);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('open-search-palette', onOpenEvent);
    };
  }, []);

  // Reset state on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setProperties([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Filter agents client-side
  const filteredAgents: Agent[] = query.length >= 2
    ? agents
        .filter((a) => {
          const q = query.toLowerCase();
          return (
            a.canonical_name.toLowerCase().includes(q) ||
            (a.first_name?.toLowerCase().includes(q) ?? false) ||
            (a.last_name?.toLowerCase().includes(q) ?? false)
          );
        })
        .slice(0, 5)
    : [];

  // Search properties server-side with debounce
  const searchProperties = useCallback(async (q: string) => {
    if (q.length < 2) {
      setProperties([]);
      return;
    }
    setLoadingProps(true);
    try {
      const pattern = `%${q}%`;
      const { data, error } = await supabase
        .from('properties')
        .select('property_id, property_code, address, area, transaction_type, price, is_retired')
        .or(`property_code.ilike.${pattern},address.ilike.${pattern},area.ilike.${pattern}`)
        .limit(5);
      if (error) throw error;
      setProperties(data ?? []);
    } catch {
      setProperties([]);
    } finally {
      setLoadingProps(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchProperties(query), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchProperties]);

  // All results for keyboard navigation
  const allResults: Array<{ type: 'agent'; data: Agent } | { type: 'property'; data: PropertyResult }> = [
    ...filteredAgents.map((a) => ({ type: 'agent' as const, data: a })),
    ...properties.map((p) => ({ type: 'property' as const, data: p })),
  ];

  // Reset activeIdx when results change
  useEffect(() => {
    setActiveIdx(0);
  }, [filteredAgents.length, properties.length]);

  // Select result
  const selectResult = useCallback((item: (typeof allResults)[number]) => {
    if (item.type === 'agent') {
      openAgent(item.data.agent_id);
    } else {
      openProperty(item.data.property_id);
    }
    setOpen(false);
  }, [openAgent, openProperty]);

  // Keyboard navigation
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && allResults[activeIdx]) {
      e.preventDefault();
      selectResult(allResults[activeIdx]);
    }
  };

  // Highlight matching text
  const highlight = (text: string) => {
    if (!query || query.length < 2) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-bold text-brand-blue">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const formatPrice = (price: number | null) => {
    if (price == null) return '—';
    return price.toLocaleString('el-GR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="search-backdrop"
          className="fixed inset-0 z-60 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <motion.div
            key="search-card"
            className="w-full max-w-xl bg-surface-card rounded-xl shadow-2xl border border-border-default overflow-hidden"
            initial={{ opacity: 0, y: -20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border-default">
              <svg className="w-5 h-5 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Αναζήτηση agent ή ακινήτου..."
                className="flex-1 bg-transparent text-text-primary placeholder:text-text-muted outline-none text-base"
              />
              <kbd className="hidden sm:inline-flex px-1.5 py-0.5 text-xs text-text-muted bg-surface-light rounded border border-border-default font-mono">
                ESC
              </kbd>
            </div>

            {/* Results */}
            {query.length >= 2 && (
              <div className="max-h-80 overflow-y-auto">
                {/* Agents section */}
                {filteredAgents.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Σύμβουλοι
                    </div>
                    {filteredAgents.map((agent, i) => {
                      const idx = i;
                      return (
                        <button
                          key={agent.agent_id}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            activeIdx === idx ? 'bg-brand-blue/10' : 'hover:bg-surface-light'
                          }`}
                          onClick={() => selectResult({ type: 'agent', data: agent })}
                          onMouseEnter={() => setActiveIdx(idx)}
                        >
                          <div className="w-8 h-8 rounded-full bg-brand-blue/15 flex items-center justify-center text-brand-blue text-sm font-bold shrink-0">
                            {agent.canonical_name.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-text-primary truncate">
                              {highlight(agent.canonical_name)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-muted">
                              {agent.office && (
                                <span className="px-1.5 py-0.5 rounded bg-surface-light text-text-secondary text-[11px]">
                                  {agent.office}
                                </span>
                              )}
                              {agent.is_team && (
                                <span className="text-brand-purple text-[11px]">Team</span>
                              )}
                            </div>
                          </div>
                          {!agent.is_active && (
                            <span className="text-[11px] text-brand-red/70 shrink-0">Ανενεργός</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Properties section */}
                {properties.length > 0 && (
                  <div>
                    <div className="px-4 pt-3 pb-1 text-xs font-semibold text-text-muted uppercase tracking-wider">
                      Ακίνητα
                    </div>
                    {properties.map((prop, i) => {
                      const idx = filteredAgents.length + i;
                      const txLabel = prop.transaction_type === 'rent' ? 'Ενοικίαση' : 'Πώληση';
                      return (
                        <button
                          key={prop.property_id}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            activeIdx === idx ? 'bg-brand-blue/10' : 'hover:bg-surface-light'
                          }`}
                          onClick={() => selectResult({ type: 'property', data: prop })}
                          onMouseEnter={() => setActiveIdx(idx)}
                        >
                          <div className="w-8 h-8 rounded-lg bg-brand-green/15 flex items-center justify-center text-brand-green shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-text-primary truncate">
                              <span className="font-mono font-semibold">{prop.property_code ? highlight(prop.property_code) : '—'}</span>
                              {prop.address && (
                                <span className="ml-2 text-text-secondary">{highlight(prop.address)}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-text-muted">
                              <span className={`px-1.5 py-0.5 rounded text-[11px] ${
                                prop.transaction_type === 'rent'
                                  ? 'bg-brand-teal/10 text-brand-teal'
                                  : 'bg-brand-orange/10 text-brand-orange'
                              }`}>
                                {txLabel}
                              </span>
                              {prop.area && <span>{prop.area}</span>}
                            </div>
                          </div>
                          <div className="text-sm font-semibold text-text-primary shrink-0">
                            {formatPrice(prop.price)}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Loading */}
                {loadingProps && filteredAgents.length === 0 && properties.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-text-muted">
                    Αναζήτηση...
                  </div>
                )}

                {/* No results */}
                {!loadingProps && filteredAgents.length === 0 && properties.length === 0 && (
                  <div className="px-4 py-6 text-center text-sm text-text-muted">
                    Δεν βρέθηκαν αποτελέσματα
                  </div>
                )}
              </div>
            )}

            {/* Hint when empty */}
            {query.length < 2 && (
              <div className="px-4 py-6 text-center text-sm text-text-muted">
                Πληκτρολογήστε τουλάχιστον 2 χαρακτήρες...
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
