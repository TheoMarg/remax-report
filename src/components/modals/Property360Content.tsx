import { useMemo } from 'react';
import { usePropertyDetail } from '../../hooks/usePropertyDetail';
import { usePropertyJourneys } from '../../hooks/usePropertyJourneys';
import { useQualityMetrics } from '../../hooks/useQualityMetrics';
import { useMarketability } from '../../hooks/useMarketability';
import { usePeriod } from '../../hooks/usePeriod';
import { EntityLink } from '../shared/EntityLink';
import { PropertyTimeline } from '../properties/PropertyTimeline';
import { PropertyShowings } from '../properties/PropertyShowings';
import { formatDateEL, computeStageDurations, daysBetween } from '../../lib/propertyMetrics';
import type { PriceChange } from '../../lib/types';

function fmtEur(n: number | null | undefined): string {
  if (n == null) return '—';
  return `€${n.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

/** Build a complete price journey: publication → changes → closing */
interface PriceStep {
  date: string;
  price: number;
  label: string;
  changeEur: number | null;
  changePct: number | null;
  daysSincePrev: number | null;
}

function buildPriceJourney(
  pubDate: string | null,
  registrationDate: string | null,
  listingPrice: number | null,
  changes: PriceChange[],
  closingDate: string | null,
  closingPrice: number | null,
): PriceStep[] {
  const steps: PriceStep[] = [];

  // 1. Initial price — use pub date, fallback to registration date
  const startDate = pubDate?.slice(0, 10) ?? registrationDate?.slice(0, 10) ?? null;
  const startLabel = pubDate ? 'Δημοσίευση' : 'Καταγραφή';
  const initialPrice = changes.length > 0 ? changes[0].old_price : listingPrice;
  if (startDate && initialPrice != null) {
    steps.push({
      date: startDate,
      price: initialPrice,
      label: startLabel,
      changeEur: null,
      changePct: null,
      daysSincePrev: null,
    });
  }

  // 2. Price changes
  for (const pc of changes) {
    if (pc.new_price == null) continue;
    const prevDate = steps.length > 0 ? steps[steps.length - 1].date : null;
    steps.push({
      date: pc.change_date.slice(0, 10),
      price: pc.new_price,
      label: 'Αλλαγή τιμής',
      changeEur: pc.change_eur,
      changePct: pc.change_pct,
      daysSincePrev: prevDate ? daysBetween(prevDate, pc.change_date.slice(0, 10)) : null,
    });
  }

  // 3. Closing — show even without price (use listing price as fallback)
  if (closingDate) {
    const effClosingPrice = closingPrice ?? listingPrice;
    const prevDate = steps.length > 0 ? steps[steps.length - 1].date : null;
    const lastStep = steps[steps.length - 1];
    if (lastStep && lastStep.date === closingDate.slice(0, 10) && effClosingPrice != null && lastStep.price === effClosingPrice) {
      lastStep.label = 'Κλείσιμο';
    } else if (effClosingPrice != null) {
      const prevPrice = steps.length > 0 ? steps[steps.length - 1].price : null;
      const chgEur = prevPrice != null ? effClosingPrice - prevPrice : null;
      const chgPct = prevPrice != null && prevPrice > 0 ? ((effClosingPrice - prevPrice) / prevPrice) * 100 : null;
      steps.push({
        date: closingDate.slice(0, 10),
        price: effClosingPrice,
        label: 'Κλείσιμο',
        changeEur: chgEur !== 0 ? chgEur : null,
        changePct: chgPct !== 0 ? chgPct : null,
        daysSincePrev: prevDate ? daysBetween(prevDate, closingDate.slice(0, 10)) : null,
      });
    } else {
      // No price at all — still show the closing date
      steps.push({
        date: closingDate.slice(0, 10),
        price: 0,
        label: 'Κλείσιμο',
        changeEur: null,
        changePct: null,
        daysSincePrev: prevDate ? daysBetween(prevDate, closingDate.slice(0, 10)) : null,
      });
    }
  }

  return steps;
}

interface Props {
  propertyId: string;
}

export function Property360Content({ propertyId }: Props) {
  const { property, agent, events, showings, priceChanges, exclusive, closing, isLoading } = usePropertyDetail(propertyId);
  const { period } = usePeriod();
  const { data: journeys = [] } = usePropertyJourneys(period);

  // Find this property's journey
  const journey = journeys.find(j => j.property_id === propertyId);
  // Company averages for stage comparison
  const { total: companyAvg } = useQualityMetrics(journeys);

  // Marketability score for this property
  const { marketAdjusted } = useMarketability();
  const marketabilityScore = useMemo(() => {
    for (const agentResult of marketAdjusted) {
      const propScore = agentResult.property_scores.find(ps => ps.property_id === propertyId);
      if (propScore) return propScore.score;
    }
    return null;
  }, [marketAdjusted, propertyId]);

  const prop = property.data;
  const agentData = agent.data;
  const eventsData = events.data ?? [];
  const showingsData = showings.data ?? [];
  const priceData = priceChanges.data ?? [];
  const excl = exclusive.data;
  const closingData = closing.data;

  const stages = computeStageDurations(eventsData);

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-pulse text-text-muted">Φόρτωση...</div>
      </div>
    );
  }

  if (!prop) {
    return (
      <div className="p-8 text-center">
        <div className="text-text-muted">Δεν βρέθηκε ακίνητο</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text-primary">
          {prop.property_code || prop.property_id}
        </h2>
        <div className="flex items-center gap-2 mt-1 text-sm text-text-muted flex-wrap">
          <span>{[prop.address, prop.area].filter(Boolean).join(', ') || '—'}</span>
          {prop.subcategory && (
            <span className="text-[10px] bg-surface border border-border-default rounded-lg px-1.5 py-0.5 text-text-secondary">
              {prop.subcategory}
            </span>
          )}
          {marketabilityScore != null && (
            <span className={`text-[10px] font-semibold rounded-lg px-1.5 py-0.5 ${
              marketabilityScore >= 80 ? 'bg-green-100 text-green-700' :
              marketabilityScore >= 50 ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              Marketability: {marketabilityScore}/100
            </span>
          )}
          {prop.transaction_type && (
            <span className={`text-[10px] font-semibold rounded-lg px-1.5 py-0.5 ${
              prop.transaction_type === 'Πώληση'
                ? 'bg-brand-blue/10 text-brand-blue'
                : 'bg-brand-orange/10 text-brand-orange'
            }`}>
              {prop.transaction_type}
            </span>
          )}
        </div>
      </div>

      {/* Physical attributes */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Τιμή', value: fmtEur(prop.price) },
          { label: 'Εμβαδό', value: prop.size_sqm ? `${prop.size_sqm} τ.μ.` : '—' },
          { label: 'Δωμάτια', value: prop.bedrooms != null ? String(prop.bedrooms) : '—' },
          { label: 'Όροφος', value: prop.floor || '—' },
          { label: 'Έτος', value: prop.year_built || '—' },
          { label: 'Ενέργεια', value: prop.energy_class || '—' },
        ].map(attr => (
          <div key={attr.label} className="bg-surface rounded-lg p-2 text-center border border-border-subtle">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">{attr.label}</div>
            <div className="text-sm font-bold text-text-primary mt-0.5">{attr.value}</div>
          </div>
        ))}
      </div>

      {/* Status section */}
      <div className="bg-surface rounded-lg p-3 border border-border-subtle space-y-1.5">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Κατάσταση</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-secondary">
          {excl && (
            <span>
              <span className="text-text-muted">Αποκλειστική:</span>{' '}
              <span className="font-medium">{formatDateEL(excl.sign_date)} — {formatDateEL(excl.end_date)}</span>
            </span>
          )}
          {prop.days_on_market != null && (
            <span>
              <span className="text-text-muted">DOM:</span>{' '}
              <span className="font-bold text-brand-orange">{prop.days_on_market}</span>
            </span>
          )}
          {agentData && (
            <span>
              <span className="text-text-muted">Σύμβουλος:</span>{' '}
              <EntityLink type="agent" id={agentData.agent_id} label={agentData.canonical_name} className="text-xs font-medium" />
            </span>
          )}
          {excl?.owner_name && (
            <span>
              <span className="text-text-muted">Ιδιοκτήτης:</span>{' '}
              <span className="font-medium">{excl.owner_name}</span>
            </span>
          )}
          {prop.is_retired && (() => {
            // If there's a closing, show that instead of deactivation reason
            if (closingData) {
              return (
                <span className="text-brand-green font-semibold">
                  Έκλεισε από εμάς
                </span>
              );
            }
            // Otherwise extract reason from latest deactivation event
            const lastDeact = [...eventsData].reverse().find(e => e.event_type === 'deactivation');
            const reason = lastDeact?.detail?.match(/χαρακτηρισμό: (.+)/)?.[1] ?? prop.retirement_reason;
            return (
              <span className="text-brand-red font-semibold">
                Αποσυρμένο{reason ? `: ${reason}` : ''}
              </span>
            );
          })()}
        </div>
      </div>

      {/* Journey Milestones */}
      {journey && (
        <div className="bg-surface rounded-lg p-3 border border-border-subtle">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Journey Milestones (Στάδια Πορείας)</h3>
          <div className="flex items-center gap-1 text-[10px]">
            {[
              { label: 'Καταγρ.', done: journey.has_registration, date: journey.dt_registration },
              { label: 'Αποκλ.', done: journey.has_exclusive, date: journey.dt_exclusive },
              { label: 'Δημοσ.', done: journey.has_published, date: journey.dt_published },
              { label: 'Υπόδ.', done: journey.has_showing, date: journey.dt_first_showing },
              { label: 'Προσφ.', done: journey.has_offer, date: journey.dt_offer },
              { label: 'Κλείσ.', done: journey.has_closing, date: journey.dt_closing },
            ].map((m, i, arr) => (
              <div key={m.label} className="flex items-center gap-1 flex-1">
                <div className={`flex flex-col items-center flex-1 ${m.done ? 'text-brand-green' : 'text-text-muted'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 ${
                    m.done ? 'bg-brand-green/10 border-brand-green text-brand-green' : 'bg-surface-light border-border-default'
                  }`}>
                    {m.done ? '\u2713' : ''}
                  </div>
                  <span className="mt-0.5 font-semibold">{m.label}</span>
                  {m.date && <span className="text-[8px] text-text-muted">{formatDateEL(m.date)}</span>}
                </div>
                {i < arr.length - 1 && (
                  <div className={`h-0.5 w-3 shrink-0 ${m.done ? 'bg-brand-green/40' : 'bg-border-subtle'}`} />
                )}
              </div>
            ))}
          </div>

          {/* Stage durations vs company avg */}
          {(journey.days_reg_to_excl != null || journey.days_excl_to_closing != null || journey.days_total_journey != null) && (
            <div className="mt-3 pt-2 border-t border-border-subtle">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                {[
                  { label: 'Reg → Excl', val: journey.days_reg_to_excl, avg: companyAvg.avg_days_reg_to_excl },
                  { label: 'Excl → Offer', val: journey.days_excl_to_offer, avg: companyAvg.avg_days_excl_to_offer },
                  { label: 'Offer → Close', val: journey.days_offer_to_closing, avg: companyAvg.avg_days_offer_to_closing },
                  { label: 'Total Journey', val: journey.days_total_journey, avg: companyAvg.avg_days_total_journey },
                ].filter(r => r.val != null).map(row => (
                  <div key={row.label} className="flex items-center justify-between">
                    <span className="text-text-muted">{row.label}:</span>
                    <span className="flex items-center gap-1.5">
                      <span className={`font-bold ${
                        row.avg != null && row.val != null && row.val < row.avg ? 'text-brand-green' : row.avg != null && row.val != null && row.val > row.avg ? 'text-brand-red' : 'text-text-primary'
                      }`}>
                        {row.val}d
                      </span>
                      {row.avg != null && (
                        <span className="text-text-muted">(avg {row.avg}d)</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              {journey.price_delta_pct != null && (
                <div className="flex items-center justify-between mt-1 text-[10px]">
                  <span className="text-text-muted">Price Delta:</span>
                  <span className={`font-bold ${
                    journey.price_delta_pct < 0 ? 'text-brand-red' : journey.price_delta_pct > 0 ? 'text-brand-green' : 'text-text-primary'
                  }`}>
                    {journey.price_delta_pct > 0 ? '+' : ''}{journey.price_delta_pct.toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">Timeline (Χρονολόγιο)</h3>
        <PropertyTimeline events={eventsData} stages={stages} />
      </div>

      {/* Showings */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">Υποδείξεις ({showingsData.length})</h3>
        <PropertyShowings showings={showingsData} />
      </div>

      {/* Price history */}
      {(() => {
        const journey = buildPriceJourney(
          prop.first_pub_date,
          prop.registration_date ?? null,
          prop.price,
          priceData,
          closingData?.closing_date ?? null,
          closingData?.price ?? null,
        );
        if (journey.length === 0) return null;

        // Compute total change from first to last
        const first = journey[0];
        const last = journey[journey.length - 1];
        const totalChgEur = journey.length > 1 ? last.price - first.price : null;
        const totalChgPct = journey.length > 1 && first.price > 0
          ? ((last.price - first.price) / first.price) * 100 : null;
        const totalDays = journey.length > 1 ? daysBetween(first.date, last.date) : null;

        return (
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-2">Ιστορικό Τιμών</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-text-muted border-b border-border-default">
                    <th className="pb-1.5 pr-2 font-medium">Στάδιο</th>
                    <th className="pb-1.5 pr-2 font-medium">Ημ/νία</th>
                    <th className="pb-1.5 pr-2 font-medium text-right">Τιμή</th>
                    <th className="pb-1.5 pr-2 font-medium text-right">Μεταβολή</th>
                    <th className="pb-1.5 pr-2 font-medium text-right">%</th>
                    <th className="pb-1.5 font-medium text-right">Ημέρες</th>
                  </tr>
                </thead>
                <tbody>
                  {journey.map((step, i) => (
                    <tr key={`${step.date}-${i}`} className="border-b border-border-subtle">
                      <td className="py-1.5 pr-2 text-text-secondary font-medium">{step.label}</td>
                      <td className="py-1.5 pr-2 tabular-nums text-text-muted">{formatDateEL(step.date)}</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums font-bold text-text-primary">{step.price > 0 ? fmtEur(step.price) : '—'}</td>
                      <td className={`py-1.5 pr-2 text-right tabular-nums font-medium ${
                        (step.changeEur ?? 0) < 0 ? 'text-brand-red' : (step.changeEur ?? 0) > 0 ? 'text-brand-green' : 'text-text-muted'
                      }`}>
                        {step.changeEur != null ? `${step.changeEur > 0 ? '+' : ''}${fmtEur(step.changeEur)}` : '—'}
                      </td>
                      <td className={`py-1.5 pr-2 text-right tabular-nums ${
                        (step.changePct ?? 0) < 0 ? 'text-brand-red' : (step.changePct ?? 0) > 0 ? 'text-brand-green' : 'text-text-muted'
                      }`}>
                        {step.changePct != null ? `${step.changePct > 0 ? '+' : ''}${step.changePct.toLocaleString('el-GR', { maximumFractionDigits: 1 })}%` : '—'}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-text-muted">
                        {step.daysSincePrev != null ? step.daysSincePrev : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Total row */}
                {journey.length > 1 && totalChgEur !== null && (
                  <tfoot>
                    <tr className="border-t-2 border-border-default font-semibold">
                      <td className="py-1.5 pr-2 text-text-primary" colSpan={2}>Σύνολο</td>
                      <td className="py-1.5 pr-2 text-right tabular-nums text-text-primary">{fmtEur(last.price)}</td>
                      <td className={`py-1.5 pr-2 text-right tabular-nums ${totalChgEur < 0 ? 'text-brand-red' : totalChgEur > 0 ? 'text-brand-green' : 'text-text-muted'}`}>
                        {totalChgEur !== 0 ? `${totalChgEur > 0 ? '+' : ''}${fmtEur(totalChgEur)}` : '€0'}
                      </td>
                      <td className={`py-1.5 pr-2 text-right tabular-nums ${(totalChgPct ?? 0) < 0 ? 'text-brand-red' : (totalChgPct ?? 0) > 0 ? 'text-brand-green' : 'text-text-muted'}`}>
                        {totalChgPct != null ? `${totalChgPct > 0 ? '+' : ''}${totalChgPct.toLocaleString('el-GR', { maximumFractionDigits: 1 })}%` : '0%'}
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-text-muted">{totalDays ?? '—'}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        );
      })()}

      {/* Closing info */}
      {closingData && (
        <div className="bg-brand-green/5 border border-brand-green/20 rounded-lg p-3">
          <h3 className="text-sm font-semibold text-brand-green mb-2">Κλείσιμο</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-secondary">
            <span>
              <span className="text-text-muted">Ημ/νία:</span>{' '}
              <span className="font-medium">{formatDateEL(closingData.closing_date)}</span>
            </span>
            <span>
              <span className="text-text-muted">Τιμή:</span>{' '}
              <span className="font-bold">{fmtEur(closingData.price ?? prop.price)}</span>
            </span>
            {closingData.gci != null && (
              <span>
                <span className="text-text-muted">GCI:</span>{' '}
                <span className="font-bold text-brand-gold">{fmtEur(closingData.gci)}</span>
              </span>
            )}
            {closingData.closing_type && closingData.closing_type !== 'unknown' && (
              <span>
                <span className="text-text-muted">Τύπος:</span>{' '}
                <span className="font-medium">{closingData.closing_type}</span>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
