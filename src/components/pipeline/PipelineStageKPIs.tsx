import type { PropertyJourney } from '../../lib/types';
import type { StageName, StageFlowResult } from '../../hooks/useStageFlow';

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('el-GR');
}

function fmtEur(n: number | null | undefined): string {
  if (n == null) return '—';
  return `€${n.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return '—';
  return `${n}%`;
}

interface KpiCard {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

function computeStageKPIs(
  stage: StageName,
  flow: StageFlowResult,
  _journeys: PropertyJourney[],
  stageJourneys: PropertyJourney[],
): KpiCard[] {
  switch (stage) {
    case 'registration': {
      const sale = stageJourneys.filter(j => j.category === 'sale' || j.category === 'Πώληση').length;
      const rent = stageJourneys.length - sale;
      const avgPrice = stageJourneys.length > 0
        ? stageJourneys.reduce((s, j) => s + (j.listing_price || 0), 0) / stageJourneys.length
        : null;
      const avgSqm = stageJourneys.filter(j => j.size_sqm).length > 0
        ? stageJourneys.reduce((s, j) => s + (j.size_sqm || 0), 0) / stageJourneys.filter(j => j.size_sqm).length
        : null;
      const withExcl = stageJourneys.filter(j => j.has_exclusive).length;
      return [
        { label: 'Καταγραφές', value: fmt(flow.inflow), color: '#1B5299' },
        { label: 'Πώληση / Ενοικ.', value: `${sale} / ${rent}` },
        { label: '→ Αποκλειστικές', value: fmt(withExcl), sub: fmtPct(flow.conversion_pct), color: '#168F80' },
        { label: 'Μ.Ο. Τιμής', value: fmtEur(avgPrice ? Math.round(avgPrice) : null) },
        { label: 'Μ.Ο. m²', value: avgSqm ? `${Math.round(avgSqm)} τ.μ.` : '—' },
      ];
    }
    case 'exclusive': {
      const avgDaysCapture = stageJourneys.filter(j => j.days_reg_to_excl != null);
      const avgCapture = avgDaysCapture.length > 0
        ? Math.round(avgDaysCapture.reduce((s, j) => s + j.days_reg_to_excl!, 0) / avgDaysCapture.length)
        : null;
      const dormant = stageJourneys.filter(j => j.has_exclusive && !j.has_showing).length;
      const withShowing = stageJourneys.filter(j => j.has_showing).length;
      return [
        { label: 'Αποκλειστικές', value: fmt(flow.inflow), color: '#168F80' },
        { label: '← Από Καταγραφή', value: fmtPct(flow.conversion_pct) },
        { label: '→ Υπόδειξη', value: fmt(withShowing), sub: `${stageJourneys.length > 0 ? Math.round(withShowing / stageJourneys.length * 100) : 0}%`, color: '#6B5CA5' },
        { label: 'Μ.Ο. Ημέρες Capture', value: avgCapture != null ? `${avgCapture}d` : '—' },
        { label: 'Dormant', value: fmt(dormant), color: '#D4722A' },
      ];
    }
    case 'showing': {
      const totalShowings = stageJourneys.reduce((s, j) => s + j.total_showings, 0);
      const uniqueClients = stageJourneys.reduce((s, j) => s + j.unique_clients, 0);
      const avgPerProp = stageJourneys.length > 0
        ? Math.round(totalShowings / stageJourneys.length * 10) / 10 : null;
      const withOffer = stageJourneys.filter(j => j.has_offer).length;
      return [
        { label: 'Ακίνητα με Υπόδειξη', value: fmt(flow.inflow), color: '#6B5CA5' },
        { label: 'Σύνολο Υποδείξεων', value: fmt(totalShowings) },
        { label: 'Υποδ./Ακίνητο', value: avgPerProp != null ? `${avgPerProp}` : '—' },
        { label: 'Μοναδικοί Πελάτες', value: fmt(uniqueClients) },
        { label: '→ Προσφορά', value: fmt(withOffer), sub: fmtPct(flow.conversion_pct), color: '#C9961A' },
      ];
    }
    case 'offer': {
      const avgShowToOffer = stageJourneys.filter(j => j.days_excl_to_offer != null);
      const avgDays = avgShowToOffer.length > 0
        ? Math.round(avgShowToOffer.reduce((s, j) => s + j.days_excl_to_offer!, 0) / avgShowToOffer.length)
        : null;
      const withClosing = stageJourneys.filter(j => j.has_closing).length;
      const fallthrough = stageJourneys.filter(j => j.has_offer && !j.has_closing).length;
      const showingsNeeded = stageJourneys.length > 0
        ? Math.round(stageJourneys.reduce((s, j) => s + j.total_showings, 0) / stageJourneys.length * 10) / 10
        : null;
      return [
        { label: 'Προσφορές', value: fmt(flow.inflow), color: '#C9961A' },
        { label: '→ Κλείσιμο', value: fmt(withClosing), sub: fmtPct(flow.conversion_pct), color: '#D4722A' },
        { label: 'Fallthrough', value: fmt(fallthrough), color: '#C0392B' },
        { label: 'Μ.Ο. Ημέρες Excl→Offer', value: avgDays != null ? `${avgDays}d` : '—' },
        { label: 'Υποδ. ανά Προσφ.', value: showingsNeeded != null ? `${showingsNeeded}` : '—' },
      ];
    }
    case 'closing': {
      const totalGci = stageJourneys.reduce((s, j) => s + (j.gci || 0), 0);
      const avgDelta = stageJourneys.filter(j => j.price_delta_pct != null);
      const avgPriceDelta = avgDelta.length > 0
        ? Math.round(avgDelta.reduce((s, j) => s + j.price_delta_pct!, 0) / avgDelta.length * 10) / 10
        : null;
      const avgDom = stageJourneys.filter(j => j.days_total_journey != null);
      const avgDays = avgDom.length > 0
        ? Math.round(avgDom.reduce((s, j) => s + j.days_total_journey!, 0) / avgDom.length)
        : null;
      const avgGciPerDeal = stageJourneys.length > 0 ? Math.round(totalGci / stageJourneys.length) : null;
      return [
        { label: 'Κλεισίματα', value: fmt(flow.inflow), color: '#D4722A' },
        { label: 'Σύνολο GCI', value: fmtEur(totalGci), color: '#C9961A' },
        { label: 'GCI / Deal', value: fmtEur(avgGciPerDeal) },
        { label: 'Price Δ%', value: avgPriceDelta != null ? `${avgPriceDelta > 0 ? '+' : ''}${avgPriceDelta}%` : '—' },
        { label: 'Μ.Ο. Ημέρες', value: avgDays != null ? `${avgDays}d` : '—' },
      ];
    }
    default:
      return [
        { label: 'Count', value: fmt(flow.inflow) },
      ];
  }
}

interface Props {
  stage: StageName;
  flow: StageFlowResult;
  journeys: PropertyJourney[];
  stageJourneys: PropertyJourney[];
}

export function PipelineStageKPIs({ stage, flow, journeys, stageJourneys }: Props) {
  const kpis = computeStageKPIs(stage, flow, journeys, stageJourneys);

  return (
    <div className="grid grid-cols-5 gap-2">
      {kpis.map(kpi => (
        <div key={kpi.label} className="bg-surface rounded-lg p-3 border border-border-subtle text-center">
          <div className="text-[9px] font-semibold uppercase tracking-wider text-text-muted">{kpi.label}</div>
          <div className="text-lg font-bold mt-0.5" style={{ color: kpi.color }}>
            {kpi.value}
          </div>
          {kpi.sub && (
            <div className="text-[10px] text-text-muted mt-0.5">{kpi.sub}</div>
          )}
        </div>
      ))}
    </div>
  );
}
