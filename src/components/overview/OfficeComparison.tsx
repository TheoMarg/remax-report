import type { OfficeSummary } from '../../lib/metrics';

interface Props {
  offices: OfficeSummary[];
}

interface StatRowProps {
  label: string;
  values: number[];
  format?: 'number' | 'currency';
}

function StatRow({ label, values, format = 'number' }: StatRowProps) {
  const fmt = (v: number) =>
    format === 'currency'
      ? `€${v.toLocaleString('el-GR', { minimumFractionDigits: 0 })}`
      : v.toLocaleString('el-GR');

  const max = Math.max(...values);
  return (
    <div className="flex items-center text-xs py-1.5 border-b border-[#F7F6F3] last:border-0">
      <div className="w-[120px] text-[#8A94A0] shrink-0">{label}</div>
      {values.map((v, i) => (
        <div
          key={i}
          className={`flex-1 text-center font-medium ${
            v === max && values.filter(x => x === max).length === 1
              ? 'text-[#1D7A4E] font-bold'
              : 'text-[#0C1E3C]'
          }`}
        >
          {fmt(v)}
        </div>
      ))}
    </div>
  );
}

const OFFICE_DISPLAY: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
};

function officeName(raw: string): string {
  return OFFICE_DISPLAY[raw] || raw;
}

export function OfficeComparison({ offices }: Props) {
  // Λάρισα first
  const sorted = [...offices].sort((a, b) => {
    if (a.office === 'larissa') return -1;
    if (b.office === 'larissa') return 1;
    return a.office.localeCompare(b.office);
  });

  if (sorted.length < 2) {
    return (
      <div className="bg-white rounded-lg border border-[#DDD8D0] p-5">
        <h3 className="text-sm font-semibold text-[#0C1E3C] mb-2">Γραφείο vs Γραφείο</h3>
        <p className="text-sm text-[#8A94A0]">Χρειάζονται δεδομένα από 2+ γραφεία</p>
      </div>
    );
  }

  const o1 = sorted[0];
  const o2 = sorted[1];

  return (
    <div className="bg-white rounded-lg border border-[#DDD8D0] p-5">
      <h3 className="text-sm font-semibold text-[#0C1E3C] mb-4">Γραφείο vs Γραφείο</h3>
      {/* Office headers */}
      <div className="flex items-center mb-3">
        <div className="w-[120px]" />
        {[o1, o2].map((o, i) => (
          <div key={i} className="flex-1 text-center">
            <div className="text-sm font-bold text-[#0C1E3C]">{officeName(o.office)}</div>
            <div className="text-[10px] text-[#8A94A0]">{o.agents} συνεργάτες</div>
          </div>
        ))}
      </div>
      {/* Stats rows */}
      <StatRow label="Καταγραφές" values={[o1.registrations, o2.registrations]} />
      <StatRow label="Νέες Αποκλ." values={[o1.exclusives, o2.exclusives]} />
      <StatRow label="Νέα Δημοσ." values={[o1.published, o2.published]} />
      <StatRow label="Υποδείξεις" values={[o1.showings, o2.showings]} />
      <StatRow label="Κλεισίματα" values={[o1.closings, o2.closings]} />
      <StatRow label="Συμβολαιοπ." values={[o1.billing, o2.billing]} />
      <StatRow label="Τζίρος" values={[o1.gci, o2.gci]} format="currency" />
      {/* Per-agent averages */}
      <div className="mt-3 pt-3 border-t border-[#DDD8D0]">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8A94A0] mb-2">
          Μέσος όρος ανά συνεργάτη/μήνα
        </div>
        <StatRow
          label="Καταγραφές"
          values={[
            o1.agents > 0 ? Math.round(o1.registrations / o1.agents) : 0,
            o2.agents > 0 ? Math.round(o2.registrations / o2.agents) : 0,
          ]}
        />
        <StatRow
          label="Κλεισίματα"
          values={[
            o1.agents > 0 ? Math.round(o1.closings / o1.agents) : 0,
            o2.agents > 0 ? Math.round(o2.closings / o2.agents) : 0,
          ]}
        />
        <StatRow
          label="Τζίρος"
          values={[
            o1.agents > 0 ? Math.round(o1.gci / o1.agents) : 0,
            o2.agents > 0 ? Math.round(o2.gci / o2.agents) : 0,
          ]}
          format="currency"
        />
      </div>
    </div>
  );
}
