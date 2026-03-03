import type { PeriodType } from '../../lib/types';

const MONTH_NAMES_EL = [
  'Ιαν', 'Φεβ', 'Μαρ', 'Απρ', 'Μαΐ', 'Ιουν',
  'Ιουλ', 'Αυγ', 'Σεπ', 'Οκτ', 'Νοε', 'Δεκ',
];

interface Props {
  periodType: PeriodType;
  year: number;
  value: number;
  periodLabel: string;
  onPeriodTypeChange: (type: PeriodType) => void;
  onYearChange: (year: number) => void;
  onValueChange: (value: number) => void;
  onSignOut: () => void;
  userEmail: string;
}

export function Header({
  periodType,
  year,
  value,
  periodLabel,
  onPeriodTypeChange,
  onYearChange,
  onValueChange,
  onSignOut,
  userEmail,
}: Props) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <header className="bg-[#0C1E3C] text-white px-6 py-3 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold tracking-tight">RE/MAX Delta Ktima</h1>
        <span className="text-[#8A94A0] text-sm hidden sm:inline">Αναφορά Broker</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Period type selector */}
        <div className="flex bg-[#1B5299]/30 rounded-md overflow-hidden text-sm">
          {(['month', 'quarter', 'year'] as PeriodType[]).map((t) => (
            <button
              key={t}
              onClick={() => onPeriodTypeChange(t)}
              className={`px-3 py-1 transition-colors ${
                periodType === t ? 'bg-[#1B5299] text-white' : 'text-[#8A94A0] hover:text-white'
              }`}
            >
              {t === 'month' ? 'Μήνας' : t === 'quarter' ? 'Τρίμηνο' : 'Έτος'}
            </button>
          ))}
        </div>

        {/* Year selector */}
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="bg-[#1B5299]/30 text-white text-sm rounded-md px-2 py-1 border-none"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        {/* Month/Quarter selector */}
        {periodType === 'month' && (
          <select
            value={value}
            onChange={(e) => onValueChange(Number(e.target.value))}
            className="bg-[#1B5299]/30 text-white text-sm rounded-md px-2 py-1 border-none"
          >
            {MONTH_NAMES_EL.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        )}
        {periodType === 'quarter' && (
          <select
            value={value}
            onChange={(e) => onValueChange(Number(e.target.value))}
            className="bg-[#1B5299]/30 text-white text-sm rounded-md px-2 py-1 border-none"
          >
            {[1, 2, 3, 4].map((q) => (
              <option key={q} value={q}>Q{q}</option>
            ))}
          </select>
        )}

        <span className="text-xs text-[#8A94A0] hidden md:inline">{periodLabel}</span>

        {/* User menu */}
        <div className="flex items-center gap-2 ml-4 pl-4 border-l border-[#1B5299]/30">
          <span className="text-xs text-[#8A94A0] hidden lg:inline">{userEmail}</span>
          <button
            onClick={onSignOut}
            className="text-xs text-[#8A94A0] hover:text-white transition-colors"
          >
            Αποσύνδεση
          </button>
        </div>
      </div>
    </header>
  );
}
