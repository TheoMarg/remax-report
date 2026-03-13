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
      const withoutExcl = stageJourneys.filter(j => !j.has_exclusive).length;
      const avgDaysNoExcl = withoutExcl > 0
        ? Math.round(withoutExcl) // count of those stuck without exclusive
        : null;
      return [
        { label: 'Registrations (Καταγραφές)', value: fmt(flow.inflow), color: '#1B5299' },
        { label: 'Sale / Rent (Πώλ./Ενοικ.)', value: `${sale} / ${rent}`, sub: sale + rent > 0 ? `${Math.round(sale / (sale + rent) * 100)}% sale` : undefined },
        { label: '→ Exclusives (Αποκλ.)', value: fmt(withExcl), sub: fmtPct(flow.conversion_pct), color: '#168F80' },
        { label: 'Avg Price (Μ.Ο. Τιμής)', value: fmtEur(avgPrice ? Math.round(avgPrice) : null) },
        { label: 'Avg m² (Μ.Ο. m²)', value: avgSqm ? `${Math.round(avgSqm)} τ.μ.` : '—' },
        { label: 'No Exclusive (Χωρίς Αποκλ.)', value: fmt(avgDaysNoExcl), color: '#D4722A' },
      ];
    }
    case 'exclusive': {
      const avgDaysCapture = stageJourneys.filter(j => j.days_reg_to_excl != null);
      const avgCapture = avgDaysCapture.length > 0
        ? Math.round(avgDaysCapture.reduce((s, j) => s + j.days_reg_to_excl!, 0) / avgDaysCapture.length)
        : null;
      const dormant = stageJourneys.filter(j => j.has_exclusive && !j.has_showing).length;
      const withShowing = stageJourneys.filter(j => j.has_showing).length;
      const captureRate = flow.inflow > 0 ? Math.round(flow.inflow / stageJourneys.length * 100) : null;
      return [
        { label: 'Exclusives (Αποκλειστικές)', value: fmt(flow.inflow), color: '#168F80' },
        { label: 'Capture Rate (Excl/Reg)', value: fmtPct(captureRate) },
        { label: '→ Showing (Υπόδειξη)', value: fmt(withShowing), sub: `${stageJourneys.length > 0 ? Math.round(withShowing / stageJourneys.length * 100) : 0}%`, color: '#6B5CA5' },
        { label: 'Avg Days Capture (Μ.Ο. Ημ.)', value: avgCapture != null ? `${avgCapture}d` : '—' },
        { label: 'Dormant (Αδρανή)', value: fmt(dormant), sub: 'no showing', color: '#D4722A' },
      ];
    }
    case 'showing': {
      const totalShowings = stageJourneys.reduce((s, j) => s + j.total_showings, 0);
      const uniqueClients = stageJourneys.reduce((s, j) => s + j.unique_clients, 0);
      const avgPerProp = stageJourneys.length > 0
        ? Math.round(totalShowings / stageJourneys.length * 10) / 10 : null;
      const withOffer = stageJourneys.filter(j => j.has_offer).length;
      const coldProps = stageJourneys.filter(j => j.has_showing && j.days_on_market != null && j.days_on_market > 30 && j.total_showings <= 1).length;
      return [
        { label: 'Properties w/ Showings (Ακίνητα)', value: fmt(flow.inflow), color: '#6B5CA5' },
        { label: 'Total Showings (Σύνολο)', value: fmt(totalShowings) },
        { label: 'Showings/Property (Υποδ./Ακ.)', value: avgPerProp != null ? `${avgPerProp}` : '—' },
        { label: 'Unique Clients (Πελάτες)', value: fmt(uniqueClients) },
        { label: '→ Offer (Προσφορά)', value: fmt(withOffer), sub: fmtPct(flow.conversion_pct), color: '#C9961A' },
        { label: 'Cold Properties (Ψυχρά)', value: fmt(coldProps), sub: '>30d, ≤1 showing', color: '#DC3545' },
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
      const multipleOffers = stageJourneys.filter(j => j.has_offer && j.total_showings > 3).length;
      return [
        { label: 'Offers (Προσφορές)', value: fmt(flow.inflow), color: '#C9961A' },
        { label: '→ Closing (Κλείσιμο)', value: fmt(withClosing), sub: fmtPct(flow.conversion_pct), color: '#D4722A' },
        { label: 'Fallthrough (Αποτυχία)', value: fmt(fallthrough), color: '#C0392B' },
        { label: 'Avg Days Excl→Offer (Μ.Ο. Ημ.)', value: avgDays != null ? `${avgDays}d` : '—' },
        { label: 'Showings/Offer (Υποδ./Προσφ.)', value: showingsNeeded != null ? `${showingsNeeded}` : '—' },
        { label: 'High Interest (Πολλές Υποδ.)', value: fmt(multipleOffers), sub: '>3 showings' },
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
      const gciPerDay = avgDays && avgDays > 0 && avgGciPerDeal ? Math.round(avgGciPerDeal / avgDays) : null;
      return [
        { label: 'Closings (Κλεισίματα)', value: fmt(flow.inflow), color: '#D4722A' },
        { label: 'Total GCI (Σύνολο)', value: fmtEur(totalGci), color: '#C9961A' },
        { label: 'GCI / Deal', value: fmtEur(avgGciPerDeal) },
        { label: 'GCI / Day on Market', value: gciPerDay ? fmtEur(gciPerDay) + '/d' : '—' },
        { label: 'Price Delta (Δ%)', value: avgPriceDelta != null ? `${avgPriceDelta > 0 ? '+' : ''}${avgPriceDelta}%` : '—' },
        { label: 'Avg DOM (Μ.Ο. Ημέρες)', value: avgDays != null ? `${avgDays}d` : '—' },
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
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
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
