import { useState } from 'react';
import type { UserRole } from '../../lib/types';

interface NavItem {
  key: string;
  label: string;
  group?: string;
  requireRole?: UserRole[];
}

const PAGES: NavItem[] = [
  { key: 'overview',            label: 'Overview (Σύνοψη)' },
  { key: 'pipeline',            label: 'Pipeline (Ροή)' },
  { key: 'kpis',                label: 'KPIs (Δείκτες)' },
  { key: 'leaderboard',         label: 'Leaderboard (Κατάταξη)' },
  { key: 'portfolio-published', label: 'Portfolio', group: 'Published' },
  { key: 'portfolio-quality',   label: 'Quality', group: 'PQS' },
  { key: 'pricing',             label: 'Pricing (Τιμολόγηση)' },
  { key: 'accountability',      label: 'Accountability (Λογοδοσία)' },
  { key: 'withdrawals',         label: 'Withdrawals (Αποσύρσεις)' },
  { key: 'agent-profile',       label: 'Agent Profile (Προφίλ)' },
  { key: 'insights',            label: 'Insights (Αναλύσεις)' },
  { key: 'reports',             label: 'Reports (Αναφορές)', requireRole: ['ops_mgr'] },
  { key: 'settings',            label: 'Settings (Ρυθμίσεις)', requireRole: ['ops_mgr'] },
];

interface Props {
  activePage: string;
  onPageChange: (page: string) => void;
  userRole?: UserRole;
}

export function PageNav({ activePage, onPageChange, userRole }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const visiblePages = PAGES.filter(page => {
    if (!page.requireRole) return true;
    return userRole && page.requireRole.includes(userRole);
  });

  const activeLabel = visiblePages.find(p => p.key === activePage)?.label || 'Overview';

  return (
    <nav className="bg-surface-card border-b border-border-default">
      {/* Mobile: current page + hamburger */}
      <div className="flex items-center justify-between px-4 py-2 sm:hidden">
        <span className="text-sm font-semibold text-brand-blue">{activeLabel}</span>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-1.5 rounded-md hover:bg-surface-light text-text-muted transition-colors"
          aria-label="Toggle navigation"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile: dropdown */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-border-subtle px-2 py-1 bg-surface-card">
          {visiblePages.map(page => (
            <button
              key={page.key}
              onClick={() => { onPageChange(page.key); setMobileOpen(false); }}
              className={`block w-full text-left px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                activePage === page.key
                  ? 'bg-brand-blue/10 text-brand-blue'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-light'
              }`}
            >
              {page.label}
              {page.group && <span className="ml-1 text-xs text-text-muted">({page.group})</span>}
            </button>
          ))}
        </div>
      )}

      {/* Desktop: horizontal tabs */}
      <div className="hidden sm:flex gap-1 overflow-x-auto px-6 max-w-[1600px] mx-auto">
        {visiblePages.map((page) => (
          <button
            key={page.key}
            onClick={() => onPageChange(page.key)}
            className={`px-3 lg:px-4 py-3 text-xs lg:text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
              activePage === page.key
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-text-muted hover:text-text-primary hover:border-border-default'
            }`}
          >
            {page.label}
            {page.group && (
              <span className="ml-1 text-[10px] lg:text-xs text-text-muted">({page.group})</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
