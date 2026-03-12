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
    <header className="relative overflow-hidden">
      {/* Background with gradient */}
      <div className="absolute inset-0 hero-gradient" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_60%)]" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative z-10 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
              <span className="text-sm font-black text-white/90">R</span>
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white">
                RE/MAX Delta Ktima
              </h1>
              <span className="text-[10px] text-white/50 font-medium uppercase tracking-wider hidden sm:block">
                ΑΝΑΦΟΡΑ BROKER
              </span>
            </div>
          </div>
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center gap-2 sm:gap-3"
        >
          {/* Period type selector */}
          <div className="flex bg-white/8 backdrop-blur-sm rounded-lg overflow-hidden text-xs border border-white/10">
            {(['month', 'quarter', 'year'] as PeriodType[]).map((t) => (
              <button
                key={t}
                onClick={() => onPeriodTypeChange(t)}
                className={`px-3 py-1.5 transition-all duration-200 font-medium ${
                  periodType === t
                    ? 'bg-white/20 text-white shadow-inner'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {t === 'month' ? 'Μηνας' : t === 'quarter' ? 'Τριμηνο' : 'Ετος'}
              </button>
            ))}
          </div>

          {/* Year selector */}
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="bg-white/8 backdrop-blur-sm text-white text-xs rounded-lg px-2.5 py-1.5 border border-white/10 font-medium appearance-none cursor-pointer hover:bg-white/12 transition-colors"
          >
            {years.map((y) => (
              <option key={y} value={y} className="bg-navy text-white">{y}</option>
            ))}
          </select>

          {/* Month/Quarter selector */}
          {periodType === 'month' && (
            <select
              value={value}
              onChange={(e) => onValueChange(Number(e.target.value))}
              className="bg-white/8 backdrop-blur-sm text-white text-xs rounded-lg px-2.5 py-1.5 border border-white/10 font-medium appearance-none cursor-pointer hover:bg-white/12 transition-colors"
            >
              {MONTH_NAMES_EL.map((name, i) => (
                <option key={i + 1} value={i + 1} className="bg-navy text-white">{name}</option>
              ))}
            </select>
          )}
          {periodType === 'quarter' && (
            <select
              value={value}
              onChange={(e) => onValueChange(Number(e.target.value))}
              className="bg-white/8 backdrop-blur-sm text-white text-xs rounded-lg px-2.5 py-1.5 border border-white/10 font-medium appearance-none cursor-pointer hover:bg-white/12 transition-colors"
            >
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q} className="bg-navy text-white">Q{q}</option>
              ))}
            </select>
          )}

          {/* Period label badge */}
          <div className="hidden md:flex items-center px-3 py-1 rounded-full bg-white/8 border border-white/10 backdrop-blur-sm">
            <span className="text-[10px] font-semibold text-white/70 uppercase tracking-wider">{periodLabel}</span>
          </div>

          {/* Search button */}
          <button
            onClick={() => document.dispatchEvent(new Event('open-search-palette'))}
            className="flex items-center gap-1.5 bg-white/8 backdrop-blur-sm hover:bg-white/12 text-white/60 hover:text-white rounded-lg px-2.5 py-1.5 text-xs border border-white/10 transition-all duration-200 font-medium"
            title="Αναζήτηση (Ctrl+K)"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
            </svg>
            <span className="hidden sm:inline">Αναζήτηση</span>
            <kbd className="hidden md:inline-flex px-1 py-0.5 text-[10px] bg-white/10 rounded text-white/50 font-mono ml-1">
              Ctrl+K
            </kbd>
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-white/15 mx-1 hidden sm:block" />

          {/* User menu */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-white/10 border border-white/10 flex items-center justify-center backdrop-blur-sm">
              <span className="text-[10px] font-bold text-white/80">
                {userEmail.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="hidden lg:block">
              <div className="text-[10px] text-white/50 leading-tight">{userEmail}</div>
            </div>
            <button
              onClick={onSignOut}
              className="text-[10px] font-medium text-white/40 hover:text-white/90 transition-colors px-2 py-1 rounded-md hover:bg-white/8"
            >
              Αποσυνδεση
            </button>
          </div>
        </motion.div>
      </div>
    </header>
  );
}
