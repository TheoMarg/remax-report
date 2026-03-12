import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useModal360 } from '../../contexts/Modal360Context';
import { Agent360Content } from './Agent360Content';
import { Property360Content } from './Property360Content';

export function Modal360Shell() {
  const { isOpen, current, stack, close, goBack, navPrev, navNext } = useModal360();

  // ESC to close, arrow keys to navigate, body scroll lock
  useEffect(() => {
    if (!isOpen) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft' && navPrev) { e.preventDefault(); navPrev(); }
      if (e.key === 'ArrowRight' && navNext) { e.preventDefault(); navNext(); }
      if (e.key === 'Backspace' && stack.length > 1) { e.preventDefault(); goBack(); }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [isOpen, close, goBack, navPrev, navNext, stack.length]);

  const modalKey = current ? `${current.type}-${current.id}` : 'closed';

  return (
    <AnimatePresence>
      {isOpen && current && (
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
            key={modalKey}
            className="card-premium max-w-3xl w-full max-h-[90vh] overflow-y-auto relative"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Back button when stack > 1 */}
            {stack.length > 1 && (
              <button
                onClick={goBack}
                className="absolute top-3 left-3 z-10 text-sm text-text-muted hover:text-text-primary flex items-center gap-1"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Back
              </button>
            )}

            {/* Content based on entity type */}
            {current.type === 'agent' && <Agent360Content agentId={current.id as number} />}
            {current.type === 'property' && <Property360Content propertyId={current.id as string} />}
            {current.type === 'office' && (
              <div className="p-6 text-center text-text-muted">
                <h3 className="text-lg font-semibold text-text-primary mb-2">Office 360: {current.label}</h3>
                <p className="text-sm">Office detail view will be built in Cycle I.</p>
              </div>
            )}
            {current.type === 'team' && (
              <div className="p-6 text-center text-text-muted">
                <h3 className="text-lg font-semibold text-text-primary mb-2">Team 360: {current.label}</h3>
                <p className="text-sm">Team detail view will be built in Cycle I.</p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
