import type { FunnelByTypeRow } from '../../lib/metrics';

interface Props {
  rows: FunnelByTypeRow[];
}

export function FunnelNarrative({ rows }: Props) {
  if (rows.length === 0) return null;

  const insights: string[] = [];

  // Top subcategory by registrations
  const top = rows[0];
  insights.push(
    `Η κατηγορία με τις περισσότερες καταγραφές είναι "${top.subcategory}" (${top.registrations.toLocaleString('el-GR')}).`,
  );

  // Best conversion rate (among those with >0 registrations and >0 closings)
  const withConv = rows.filter(r => r.convPct !== null && r.convPct > 0 && r.registrations >= 3);
  if (withConv.length > 0) {
    const best = withConv.reduce((a, b) => ((b.convPct ?? 0) > (a.convPct ?? 0) ? b : a));
    insights.push(
      `Καλύτερο ποσοστό μετατροπής: "${best.subcategory}" (${best.convPct}%).`,
    );
  }

  // Subcategories with zero closings but registrations > 0
  const zeroClosed = rows.filter(r => r.closings === 0 && r.registrations > 0);
  if (zeroClosed.length > 0 && zeroClosed.length <= 5) {
    const names = zeroClosed.map(r => `"${r.subcategory}"`).join(', ');
    insights.push(`Χωρίς κλεισίματα: ${names}.`);
  } else if (zeroClosed.length > 5) {
    insights.push(`${zeroClosed.length} υποκατηγορίες δεν έχουν κλεισίματα.`);
  }

  // Total registrations and closings
  const totalReg = rows.reduce((s, r) => s + r.registrations, 0);
  const totalClose = rows.reduce((s, r) => s + r.closings, 0);
  if (totalReg > 0) {
    const overallConv = Math.round((totalClose / totalReg) * 1000) / 10;
    insights.push(
      `Συνολικά: ${totalReg.toLocaleString('el-GR')} καταγραφές → ${totalClose.toLocaleString('el-GR')} κλεισίματα (${overallConv}%).`,
    );
  }

  return (
    <div className="bg-white rounded-lg border border-[#DDD8D0] p-5">
      <h3 className="text-sm font-semibold text-[#0C1E3C] mb-3">Insights</h3>
      <ul className="space-y-1.5">
        {insights.map((text, i) => (
          <li key={i} className="text-xs text-[#3A4550] leading-relaxed flex gap-2">
            <span className="text-[#C9961A] mt-0.5 shrink-0">•</span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
