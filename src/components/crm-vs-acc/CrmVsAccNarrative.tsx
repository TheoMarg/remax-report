import type { CrmVsAccRow } from '../../lib/metrics';

interface Props {
  rows: CrmVsAccRow[];
  maxDeviation: { agent: string; kpi: string; delta: number } | null;
}

export function CrmVsAccNarrative({ rows, maxDeviation }: Props) {
  if (rows.length === 0) return null;

  const insights: string[] = [];

  const totalCrm = rows.reduce((s, r) => s + r.crm, 0);
  const totalAcc = rows.reduce((s, r) => s + r.acc, 0);
  if (totalAcc > 0) {
    const totalPct = Math.round(((totalCrm - totalAcc) / totalAcc) * 1000) / 10;
    insights.push(
      `Συνολική διαφορά CRM vs Accountability: ${totalPct > 0 ? '+' : ''}${totalPct}% (CRM: ${totalCrm.toLocaleString('el-GR')}, ACC: ${totalAcc.toLocaleString('el-GR')}).`,
    );
  }

  const accHigher = rows.filter(r => r.acc > r.crm);
  if (accHigher.length > 0) {
    const names = accHigher.map(r => `"${r.label}" (${Math.abs(r.delta).toLocaleString('el-GR')})`).join(', ');
    insights.push(`Το Accountability ξεπερνά το CRM σε: ${names}.`);
  } else {
    insights.push('Σε όλα τα KPIs, το CRM ≥ Accountability.');
  }

  const withPct = rows.filter(r => r.acc > 0);
  if (withPct.length > 0) {
    const biggest = withPct.reduce((a, b) => (Math.abs(b.pctDiff) > Math.abs(a.pctDiff) ? b : a));
    insights.push(`Μεγαλύτερη ποσοστιαία απόκλιση: "${biggest.label}" (${biggest.pctDiff > 0 ? '+' : ''}${biggest.pctDiff}%).`);
  }

  if (maxDeviation) {
    const sign = maxDeviation.delta > 0 ? '+' : '';
    insights.push(`Μεγαλύτερη ατομική απόκλιση: ${maxDeviation.agent} στο "${maxDeviation.kpi}" (${sign}${maxDeviation.delta.toLocaleString('el-GR')}).`);
  }

  return (
    <div className="card-premium p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Insights</h3>
      <ul className="space-y-1.5">
        {insights.map((text, i) => (
          <li key={i} className="text-xs text-text-secondary leading-relaxed flex gap-2">
            <span className="text-brand-gold mt-0.5 shrink-0">•</span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
