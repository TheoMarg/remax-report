interface NavItem {
  key: string;
  label: string;
}

const PAGES: NavItem[] = [
  { key: 'overview',    label: 'Σύνοψη' },
  { key: 'kpis',        label: 'KPIs' },
  { key: 'withdrawals', label: 'Αποσύρσεις' },
  { key: 'funnel',      label: 'Funnel' },
  { key: 'properties',  label: 'Ακίνητα' },
  { key: 'crm-vs-acc',  label: 'CRM vs Accountability' },
  { key: 'gci',         label: 'Τζίρος' },
];

interface Props {
  activePage: string;
  onPageChange: (page: string) => void;
}

export function PageNav({ activePage, onPageChange }: Props) {
  return (
    <nav className="bg-surface-card border-b border-border-default px-6">
      <div className="flex gap-1 overflow-x-auto">
        {PAGES.map((page) => (
          <button
            key={page.key}
            onClick={() => onPageChange(page.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activePage === page.key
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-text-muted hover:text-text-primary'
            }`}
          >
            {page.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
