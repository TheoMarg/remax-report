import { useState, useMemo } from 'react';
import type { Period, PeriodType } from '../lib/types';

const MONTH_NAMES_EL = [
  'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος',
  'Μάιος', 'Ιούνιος', 'Ιούλιος', 'Αύγουστος',
  'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος',
];

function firstOfMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`;
}

function getLastCompleteMonth(): { year: number; month: number } {
  const now = new Date();
  let month = now.getMonth(); // 0-based, so current month - 1
  let year = now.getFullYear();
  if (month === 0) {
    month = 12;
    year -= 1;
  }
  return { year, month };
}

function buildPeriod(type: PeriodType, year: number, value: number): Period {
  switch (type) {
    case 'month':
      return {
        type,
        start: firstOfMonth(year, value),
        end: firstOfMonth(year, value),
        label: `${MONTH_NAMES_EL[value - 1]} ${year}`,
      };
    case 'quarter': {
      const startMonth = (value - 1) * 3 + 1;
      const endMonth = startMonth + 2;
      return {
        type,
        start: firstOfMonth(year, startMonth),
        end: firstOfMonth(year, endMonth),
        label: `Q${value} ${year}`,
      };
    }
    case 'year':
      return {
        type,
        start: firstOfMonth(year, 1),
        end: firstOfMonth(year, 12),
        label: String(year),
      };
    case 'week':
      // For now, week maps to the month it belongs to
      return {
        type,
        start: firstOfMonth(year, value),
        end: firstOfMonth(year, value),
        label: `Εβδομάδα ${MONTH_NAMES_EL[value - 1]} ${year}`,
      };
  }
}

export function usePeriod() {
  const { year: defaultYear, month: defaultMonth } = getLastCompleteMonth();
  const [periodType, setPeriodType] = useState<PeriodType>('month');
  const [year, setYear] = useState(defaultYear);
  const [value, setValue] = useState(defaultMonth); // month=1-12, quarter=1-4

  const period = useMemo(
    () => buildPeriod(periodType, year, value),
    [periodType, year, value]
  );

  return {
    period,
    periodType,
    year,
    value,
    setPeriodType,
    setYear,
    setValue,
  };
}
