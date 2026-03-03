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
    <nav className="bg-white border-b border-[#DDD8D0] px-6">
      <div className="flex gap-1 overflow-x-auto">
        {PAGES.map((page) => (
          <button
            key={page.key}
            onClick={() => onPageChange(page.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
              activePage === page.key
                ? 'border-[#1B5299] text-[#1B5299]'
                : 'border-transparent text-[#8A94A0] hover:text-[#0C1E3C]'
            }`}
          >
            {page.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
