import type { UserRole } from '../../lib/types';

interface NavItem {
  key: string;
  label: string;
  group?: string;       // for dropdown grouping
  requireRole?: UserRole[];
}

const PAGES: NavItem[] = [
  { key: 'overview',            label: 'Overview' },
  { key: 'pipeline',            label: 'Pipeline' },
  { key: 'kpis',                label: 'KPIs' },
  { key: 'leaderboard',         label: 'Leaderboard' },
  { key: 'portfolio-published', label: 'Portfolio', group: 'Published' },
  { key: 'portfolio-quality',   label: 'Quality', group: 'PQS' },
  { key: 'pricing',             label: 'Pricing' },
  { key: 'accountability',      label: 'Accountability' },
  { key: 'withdrawals',         label: 'Withdrawals' },
  { key: 'insights',            label: 'Insights' },
  { key: 'reports',             label: 'Reports', requireRole: ['ops_mgr'] },
  { key: 'settings',            label: 'Settings', requireRole: ['ops_mgr'] },
];

interface Props {
  activePage: string;
  onPageChange: (page: string) => void;
  userRole?: UserRole;
}

export function PageNav({ activePage, onPageChange, userRole }: Props) {
  const visiblePages = PAGES.filter(page => {
    if (!page.requireRole) return true;
    return userRole && page.requireRole.includes(userRole);
  });

  return (
    <nav className="bg-surface-card border-b border-border-default px-6">
      <div className="flex gap-1 overflow-x-auto max-w-[1600px] mx-auto">
        {visiblePages.map((page) => (
          <button
            key={page.key}
            onClick={() => onPageChange(page.key)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
              activePage === page.key
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-text-muted hover:text-text-primary hover:border-border-default'
            }`}
          >
            {page.label}
            {page.group && (
              <span className="ml-1 text-xs text-text-muted">({page.group})</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
}
