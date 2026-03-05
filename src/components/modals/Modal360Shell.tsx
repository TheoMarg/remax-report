import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useModal360 } from '../../contexts/Modal360Context';
import { Agent360Content } from './Agent360Content';
import { Property360Content } from './Property360Content';

export function Modal360Shell() {
  const { state, close, navPrev, navNext } = useModal360();
  const isOpen = state.type !== 'closed';

  // ESC to close, arrow keys to navigate, body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft' && navPrev) { e.preventDefault(); navPrev(); }
      if (e.key === 'ArrowRight' && navNext) { e.preventDefault(); navNext(); }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, close, navPrev, navNext]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal360-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
          {/* Prev arrow */}
          {navPrev && (
            <button
              onClick={navPrev}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white transition-colors"
              title="Προηγούμενο"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M12 15l-5-5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}

          {/* Next arrow */}
          {navNext && (
            <button
              onClick={navNext}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white/90 shadow-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-white transition-colors"
              title="Επόμενο"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M8 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          )}

          <motion.div
            key={state.type === 'agent' ? `agent-${state.agentId}` : state.type === 'property' ? `prop-${state.propertyId}` : 'closed'}
            className="card-premium max-w-3xl w-full max-h-[90vh] overflow-y-auto relative"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {state.type === 'agent' && <Agent360Content agentId={state.agentId} />}
            {state.type === 'property' && <Property360Content propertyId={state.propertyId} />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
