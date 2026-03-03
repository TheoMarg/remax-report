import type { FunnelByTypeRow } from '../../lib/metrics';

interface Props {
  rows: FunnelByTypeRow[];
}

export function FunnelTable({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-[#DDD8D0] p-5 text-center">
        <span className="text-sm text-[#8A94A0]">Δεν υπάρχουν δεδομένα</span>
      </div>
    );
  }

  const totals = rows.reduce(
    (acc, r) => ({
      registrations: acc.registrations + r.registrations,
      exclusives: acc.exclusives + r.exclusives,
      published: acc.published + r.published,
      showings: acc.showings + r.showings,
      closings: acc.closings + r.closings,
    }),
    { registrations: 0, exclusives: 0, published: 0, showings: 0, closings: 0 },
  );

  const totalConvPct =
    totals.registrations > 0
      ? Math.round((totals.closings / totals.registrations) * 1000) / 10
      : null;

  return (
    <div className="bg-white rounded-lg border border-[#DDD8D0] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F7F6F3] border-b border-[#DDD8D0]">
              <th className="text-left px-4 py-3 font-semibold text-[#0C1E3C]">Υποκατηγορία</th>
              <th className="text-right px-4 py-3 font-semibold text-[#1B5299]">Καταγρ.</th>
              <th className="text-right px-4 py-3 font-semibold text-[#168F80]">Αποκλ.</th>
              <th className="text-right px-4 py-3 font-semibold text-[#1D7A4E]">Δημοσ.</th>
              <th className="text-right px-4 py-3 font-semibold text-[#6B5CA5]">Υποδ.</th>
              <th className="text-right px-4 py-3 font-semibold text-[#D4722A]">Κλεισ.</th>
              <th className="text-right px-4 py-3 font-semibold text-[#0C1E3C]">Conv%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr
                key={r.subcategory}
                className="border-b border-[#F0EEEB] hover:bg-[#F7F6F3] transition-colors"
              >
                <td className="px-4 py-2.5 font-medium text-[#0C1E3C] truncate max-w-[200px]">
                  {r.subcategory}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.registrations.toLocaleString('el-GR')}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.exclusives.toLocaleString('el-GR')}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.published.toLocaleString('el-GR')}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.showings.toLocaleString('el-GR')}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{r.closings.toLocaleString('el-GR')}</td>
                <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                  {r.convPct !== null ? `${r.convPct}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-[#F7F6F3] border-t-2 border-[#DDD8D0] font-bold">
              <td className="px-4 py-3 text-[#0C1E3C]">Σύνολο</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.registrations.toLocaleString('el-GR')}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.exclusives.toLocaleString('el-GR')}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.published.toLocaleString('el-GR')}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.showings.toLocaleString('el-GR')}</td>
              <td className="px-4 py-3 text-right tabular-nums">{totals.closings.toLocaleString('el-GR')}</td>
              <td className="px-4 py-3 text-right tabular-nums">
                {totalConvPct !== null ? `${totalConvPct}%` : '—'}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
