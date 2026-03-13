import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useModal360 } from '../../contexts/Modal360Context';
import { Agent360Content } from './Agent360Content';
import { Property360Content } from './Property360Content';
import { Office360Content } from './Office360Content';
import { Team360Content } from './Team360Content';

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
        <>
          {/* Backdrop overlay */}
          <motion.div
            key="modal360-backdrop"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={close}
          />

          {/* Slide-in right panel */}
          <motion.div
            key="modal360-panel"
            className="fixed top-0 right-0 z-50 h-full w-full max-w-[50vw] bg-surface-card shadow-2xl border-l border-border-default flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          >
            {/* Panel header bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-default bg-surface-elevated shrink-0">
              <div className="flex items-center gap-2">
                {/* Back button */}
                {stack.length > 1 && (
                  <button
                    onClick={goBack}
                    className="text-text-muted hover:text-text-primary flex items-center gap-1 text-sm"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    Πίσω
                  </button>
                )}

                {/* Breadcrumb */}
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  {stack.length > 1 && stack.slice(0, -1).map((ref, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          // Navigate back to this point in the stack
                          for (let j = stack.length - 1; j > i; j--) goBack();
                        }}
                        className="hover:text-brand-blue"
                      >
                        {ref.label}
                      </button>
                      <span className="text-border-default">/</span>
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Prev/Next navigation */}
                {navPrev && (
                  <button
                    onClick={navPrev}
                    className="w-7 h-7 rounded-md hover:bg-surface-light flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    title="Previous"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12l-4-4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                )}
                {navNext && (
                  <button
                    onClick={navNext}
                    className="w-7 h-7 rounded-md hover:bg-surface-light flex items-center justify-center text-text-muted hover:text-text-primary transition-colors"
                    title="Next"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                )}

                {/* Close */}
                <button
                  onClick={close}
                  className="w-7 h-7 rounded-md hover:bg-surface-light flex items-center justify-center text-text-muted hover:text-text-primary transition-colors ml-1"
                  title="Close (Esc)"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <motion.div
              key={modalKey}
              className="flex-1 overflow-y-auto"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.15, delay: 0.05 }}
            >
              {current.type === 'agent' && <Agent360Content agentId={current.id as number} />}
              {current.type === 'property' && <Property360Content propertyId={current.id as string} />}
              {current.type === 'office' && <Office360Content office={current.id as string} />}
              {current.type === 'team' && <Team360Content teamId={current.id as number} teamLabel={current.label} />}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
