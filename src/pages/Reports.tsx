import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import type { Period } from '../lib/types';
import { useMetrics } from '../hooks/useMetrics';
import { computeKpis, computeOfficeComparison, computeCrmVsAccSummary, computeGciRankings, KPI_DEFS, rankAgentsByKpi } from '../lib/metrics';
import { AnimatedSection } from '../components/animations/AnimatedSection';
import { ExportPdfButton } from '../components/export/ExportPdfButton';

const OFFICE_SHORT: Record<string, string> = { larissa: 'Λάρισα', katerini: 'Κατερίνη' };

function fmtEur(n: number | null | undefined): string {
  if (n == null) return '—';
  return `€${n.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('el-GR');
}

const REPORT_SECTIONS = [
  { key: 'kpis', label: 'KPI Summary (7 κάρτες)' },
  { key: 'office', label: 'Office Comparison' },
  { key: 'rankings', label: 'Agent Rankings ανά KPI' },
  { key: 'gci', label: 'GCI Rankings' },
  { key: 'crmVsAcc', label: 'CRM vs Accountability' },
] as const;

type SectionKey = typeof REPORT_SECTIONS[number]['key'];

interface Props {
  period: Period;
}

export function Reports({ period }: Props) {
  const { data: metrics = [], isLoading } = useMetrics(period);
  const [officeFilter, setOfficeFilter] = useState<string>('all');
  const [selectedSections, setSelectedSections] = useState<Set<SectionKey>>(new Set(REPORT_SECTIONS.map(s => s.key)));

  const toggleSection = (key: SectionKey) => {
    setSelectedSections(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredMetrics = useMemo(() => {
    if (officeFilter === 'all') return metrics;
    return metrics.filter(m => m.office === officeFilter);
  }, [metrics, officeFilter]);

  const kpis = useMemo(() => computeKpis(filteredMetrics), [filteredMetrics]);
  const officeSummary = useMemo(() => computeOfficeComparison(metrics), [metrics]);
  const crmVsAcc = useMemo(() => computeCrmVsAccSummary(filteredMetrics), [filteredMetrics]);
  const gciRankings = useMemo(() => computeGciRankings(filteredMetrics), [filteredMetrics]);

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-brand-blue border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-text-muted">Φόρτωση...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="hero-gradient rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-white/60 bg-white/10 px-2.5 py-1 rounded-full mb-3">
              Reports
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold">Custom Report</h2>
            <p className="text-white/60 text-sm mt-1">{period.label} — Operations Manager</p>
          </div>
          <ExportPdfButton elementId="report-content" filename={`report-${period.label}.pdf`} />
        </div>
      </motion.div>

      {/* Filters */}
      <AnimatedSection delay={0.1}>
        <div className="card-premium p-5">
          <div className="flex flex-wrap items-center gap-6">
            {/* Office filter */}
            <div>
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Γραφείο</label>
              <select
                value={officeFilter}
                onChange={e => setOfficeFilter(e.target.value)}
                className="text-sm border border-border-default rounded-lg px-3 py-2 bg-surface-card text-text-primary"
              >
                <option value="all">Όλα</option>
                <option value="larissa">Λάρισα</option>
                <option value="katerini">Κατερίνη</option>
              </select>
            </div>

            {/* Section checkboxes */}
            <div className="flex-1">
              <label className="text-xs font-semibold text-text-muted uppercase tracking-wider block mb-1">Sections</label>
              <div className="flex flex-wrap gap-2">
                {REPORT_SECTIONS.map(s => (
                  <label key={s.key} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSections.has(s.key)}
                      onChange={() => toggleSection(s.key)}
                      className="rounded border-border-default accent-brand-blue"
                    />
                    <span className="text-xs text-text-primary">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AnimatedSection>

      {/* ═══ Report Content ═══ */}
      <div id="report-content" className="space-y-6">
        {/* KPI Summary */}
        {selectedSections.has('kpis') && (
          <AnimatedSection delay={0.15}>
            <div className="card-premium p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-4">KPI Summary — {period.label}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                {kpis.map(kpi => (
                  <div key={kpi.key} className="text-center p-3 bg-surface rounded-lg border border-border-subtle">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">{kpi.label}</div>
                    <div className="text-xl font-bold" style={{ color: kpi.color }}>{fmt(kpi.crm)}</div>
                    {kpi.acc > 0 && (
                      <div className="text-[10px] text-text-muted mt-0.5">ACC: {fmt(kpi.acc)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* Office Comparison */}
        {selectedSections.has('office') && (
          <AnimatedSection delay={0.2}>
            <div className="card-premium p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Office Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-light text-text-muted text-[10px] uppercase tracking-wider">
                      <th className="text-left px-3 py-2">Γραφείο</th>
                      <th className="text-right px-3 py-2">Agents</th>
                      <th className="text-right px-3 py-2">Καταγρ.</th>
                      <th className="text-right px-3 py-2">Αποκλ.</th>
                      <th className="text-right px-3 py-2">Υποδ.</th>
                      <th className="text-right px-3 py-2">Κλεισ.</th>
                      <th className="text-right px-3 py-2">GCI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {officeSummary.map(o => (
                      <tr key={o.office} className="border-t border-border-subtle">
                        <td className="px-3 py-2 font-medium">{OFFICE_SHORT[o.office] || o.office}</td>
                        <td className="px-3 py-2 text-right">{o.agents}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(o.registrations)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(o.exclusives)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(o.showings)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(o.closings)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-brand-gold">{fmtEur(o.gci)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* Agent Rankings */}
        {selectedSections.has('rankings') && (
          <AnimatedSection delay={0.25}>
            <div className="card-premium p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Agent Rankings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {KPI_DEFS.filter(d => d.accField !== null).slice(0, 6).map(def => {
                  const ranked = rankAgentsByKpi(filteredMetrics, def.crmField, def.accField).slice(0, 5);
                  return (
                    <div key={def.key} className="bg-surface rounded-lg p-3 border border-border-subtle">
                      <h4 className="text-xs font-semibold mb-2" style={{ color: def.color }}>{def.label}</h4>
                      {ranked.map((a, i) => (
                        <div key={a.agent_id} className="flex items-center justify-between py-1 text-xs border-b border-border-subtle last:border-0">
                          <span className="text-text-muted w-5 text-right">#{i + 1}</span>
                          <span className="flex-1 ml-2 font-medium text-text-primary truncate">{a.name}</span>
                          <span className="font-bold tabular-nums" style={{ color: def.color }}>{fmt(a.crm)}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* GCI Rankings */}
        {selectedSections.has('gci') && (
          <AnimatedSection delay={0.3}>
            <div className="card-premium p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">GCI Rankings</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-light text-text-muted text-[10px] uppercase tracking-wider">
                      <th className="text-left px-3 py-2 w-8">#</th>
                      <th className="text-left px-3 py-2">Συνεργάτης</th>
                      <th className="text-left px-3 py-2">Γραφείο</th>
                      <th className="text-right px-3 py-2">GCI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gciRankings.slice(0, 15).map(r => (
                      <tr key={r.agent_id} className="border-t border-border-subtle">
                        <td className="px-3 py-2 font-bold text-text-muted">#{r.rank}</td>
                        <td className="px-3 py-2 font-medium">{r.name}</td>
                        <td className="px-3 py-2 text-text-secondary text-xs">{OFFICE_SHORT[r.office || ''] || r.office || '—'}</td>
                        <td className="px-3 py-2 text-right font-bold text-brand-gold tabular-nums">{fmtEur(r.gci)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* CRM vs ACC */}
        {selectedSections.has('crmVsAcc') && (
          <AnimatedSection delay={0.35}>
            <div className="card-premium p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">CRM vs Accountability</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-light text-text-muted text-[10px] uppercase tracking-wider">
                      <th className="text-left px-3 py-2">KPI</th>
                      <th className="text-right px-3 py-2">CRM</th>
                      <th className="text-right px-3 py-2">ACC</th>
                      <th className="text-right px-3 py-2">Δ</th>
                      <th className="text-right px-3 py-2">Δ%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {crmVsAcc.map(row => (
                      <tr key={row.key} className="border-t border-border-subtle">
                        <td className="px-3 py-2 font-medium">{row.label}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(row.crm)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{fmt(row.acc)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">
                          <span className={row.delta >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {row.delta > 0 ? '+' : ''}{fmt(row.delta)}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-text-muted">{row.pctDiff}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </AnimatedSection>
        )}
      </div>
    </div>
  );
}
