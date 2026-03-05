import { motion } from 'framer-motion';
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
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="hero-gradient text-white px-6 py-3 flex flex-wrap items-center justify-between gap-2"
    >
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-sm font-bold">
          {userEmail.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">RE/MAX Delta Ktima</h1>
          <span className="text-white/60 text-xs hidden sm:inline">Αναφορά Broker</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Period type selector */}
        <div className="flex bg-white/10 rounded-lg overflow-hidden text-sm">
          {(['month', 'quarter', 'year'] as PeriodType[]).map((t) => (
            <button
              key={t}
              onClick={() => onPeriodTypeChange(t)}
              className={`px-3 py-1.5 transition-colors ${
                periodType === t ? 'bg-white/20 text-white font-medium' : 'text-white/60 hover:text-white'
              }`}
            >
              {t === 'month' ? 'Μήνας' : t === 'quarter' ? 'Τρίμηνο' : 'Ετος'}
            </button>
          ))}
        </div>

        {/* Year selector */}
        <select
          value={year}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="bg-white/10 text-white text-sm rounded-lg px-2 py-1.5 border-none"
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
            className="bg-white/10 text-white text-sm rounded-lg px-2 py-1.5 border-none"
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
            className="bg-white/10 text-white text-sm rounded-lg px-2 py-1.5 border-none"
          >
            {[1, 2, 3, 4].map((q) => (
              <option key={q} value={q}>Q{q}</option>
            ))}
          </select>
        )}

        <span className="text-xs text-white/50 hidden md:inline">{periodLabel}</span>

        {/* Search button */}
        <button
          onClick={() => document.dispatchEvent(new Event('open-search-palette'))}
          className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-lg px-2.5 py-1.5 text-sm transition-colors"
          title="Αναζήτηση (Ctrl+K)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
          </svg>
          <span className="hidden sm:inline">Αναζήτηση</span>
          <kbd className="hidden md:inline-flex px-1 py-0.5 text-[10px] bg-white/10 rounded text-white/50 font-mono ml-1">
            Ctrl+K
          </kbd>
        </button>

        {/* User menu */}
        <div className="flex items-center gap-2 ml-4 pl-4 border-l border-white/15">
          <span className="text-xs text-white/50 hidden lg:inline">{userEmail}</span>
          <button
            onClick={onSignOut}
            className="text-xs text-white/50 hover:text-white transition-colors"
          >
            Αποσύνδεση
          </button>
        </div>
      </div>
    </motion.header>
  );
}
