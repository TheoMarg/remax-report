import { useAgentDetail } from '../../hooks/useAgentDetail';
import { useModal360 } from '../../contexts/Modal360Context';
import { PropertyLink } from '../ui/PropertyLink';
import { formatDateEL } from '../../lib/propertyMetrics';

const OFFICE_LABEL: Record<string, string> = {
  larissa: 'Λάρισα',
  katerini: 'Κατερίνη',
};

function fmt(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('el-GR');
}

function fmtEur(n: number | null | undefined): string {
  if (n == null) return '—';
  return `€${n.toLocaleString('el-GR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

interface Props {
  agentId: number;
}

export function Agent360Content({ agentId }: Props) {
  const { close } = useModal360();
  const { profile, metrics, closings, portfolio, showingsCount, targets, withdrawals, isLoading } = useAgentDetail(agentId);

  const agent = profile.data;
  const metricsData = metrics.data ?? [];

  // YTD aggregation: current year
  const currentYear = new Date().getFullYear().toString();
  const ytdMetrics = metricsData.filter(m => m.period_start.startsWith(currentYear));
  const ytdGci = ytdMetrics.reduce((s, m) => s + (m.gci || 0), 0);
  const ytdClosings = ytdMetrics.reduce((s, m) => s + (m.crm_closings || 0), 0);
  const ytdRegistrations = ytdMetrics.reduce((s, m) => s + (m.crm_registrations || 0), 0);
  const ytdExclusives = ytdMetrics.reduce((s, m) => s + (m.crm_exclusives || 0), 0);

  const isTeam = agent?.is_team ?? false;
  const portfolioItems = portfolio.data ?? [];
  const recentClosings = closings.data ?? [];
  const totalShowings = showingsCount.data ?? 0;
  const agentTargets = targets.data;
  const withdrawalData = withdrawals.data ?? {};

  // All withdrawal reasons (including "Έκλεισε από εμάς") for breakdown
  const allWithdrawalReasons = Object.entries(withdrawalData)
    .sort(([, a], [, b]) => b - a);
  const totalWithdrawals = allWithdrawalReasons.reduce((s, [, cnt]) => s + cnt, 0);

  // Sibling property IDs for modal navigation
  const closingPropertyIds = recentClosings.map(c => c.property_id).filter(Boolean) as string[];
  const portfolioPropertyIds = portfolioItems.map(e => e.property_id).filter(Boolean) as string[];
  const allPropertyIds = [...new Set([...closingPropertyIds, ...portfolioPropertyIds])];

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-pulse text-text-muted">Φόρτωση...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-text-primary">
            {agent?.canonical_name || `Agent #${agentId}`}
          </h2>
          <div className="flex items-center gap-2 mt-1 text-sm text-text-muted flex-wrap">
            <span>{OFFICE_LABEL[agent?.office || ''] || agent?.office || '—'}</span>
            {agent?.is_active != null && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${agent.is_active ? 'bg-brand-green/10 text-brand-green' : 'bg-brand-red/10 text-brand-red'}`}>
                {agent.is_active ? 'Active' : 'Inactive'}
              </span>
            )}
            {agent?.start_date && (
              <span className="text-xs">Μέλος από: {formatDateEL(agent.start_date)}</span>
            )}
          </div>
          {(agent?.email || agent?.phone) && (
            <div className="flex items-center gap-4 mt-1 text-xs text-text-muted">
              {agent.email && <span>{agent.email}</span>}
              {agent.phone && <span>{agent.phone}</span>}
            </div>
          )}
        </div>
        <button onClick={close} className="text-text-muted hover:text-text-primary text-xl leading-none p-1">
          &times;
        </button>
      </div>

      {/* YTD KPI summary */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Τζίρος (GCI)', value: fmtEur(ytdGci), color: '#C9961A' },
          { label: 'Κλεισίματα', value: fmt(ytdClosings), color: '#D4722A' },
          { label: 'Καταχωρήσεις', value: fmt(ytdRegistrations), color: '#1B5299' },
          { label: 'Αποκλειστικές', value: fmt(ytdExclusives), color: '#168F80' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-surface rounded-lg p-3 text-center border border-border-subtle">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">{kpi.label}</div>
            <div className="text-lg font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-[9px] text-text-muted">YTD {currentYear}</div>
          </div>
        ))}
      </div>

      {/* Targets vs Actual */}
      {agentTargets && (agentTargets.gci_target || agentTargets.exclusives_target) && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">Στόχοι {currentYear}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {agentTargets.gci_target != null && agentTargets.gci_target > 0 && (
              <TargetBar
                label="Τζίρος Στόχος"
                actual={ytdGci}
                target={agentTargets.gci_target}
                color="#C9961A"
                formatter={fmtEur}
              />
            )}
            {agentTargets.gci_realistic != null && agentTargets.gci_realistic > 0 && (
              <TargetBar
                label="Τζίρος Ρεαλιστικό"
                actual={ytdGci}
                target={agentTargets.gci_realistic}
                color="#D4722A"
                formatter={fmtEur}
              />
            )}
            {agentTargets.exclusives_target != null && agentTargets.exclusives_target > 0 && (
              <TargetBar
                label="Αποκλειστικές Στόχος"
                actual={ytdExclusives}
                target={agentTargets.exclusives_target}
                color="#168F80"
                formatter={fmt}
              />
            )}
          </div>
        </div>
      )}

      {/* Recent closings */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">
          Τελευταία Κλεισίματα ({recentClosings.length})
        </h3>
        {recentClosings.length === 0 ? (
          <p className="text-xs text-text-muted italic">Δεν υπάρχουν κλεισίματα</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-text-muted border-b border-border-default">
                  <th className="pb-1.5 pr-3 font-medium">Κωδικός</th>
                  <th className="pb-1.5 pr-3 font-medium">Διεύθυνση</th>
                  <th className="pb-1.5 pr-2 font-medium">Τύπος</th>
                  <th className="pb-1.5 pr-3 font-medium text-right">Τιμή</th>
                  <th className="pb-1.5 pr-3 font-medium text-right">Τζίρος</th>
                  <th className="pb-1.5 font-medium text-right">Ημ/νία</th>
                </tr>
              </thead>
              <tbody>
                {recentClosings.map(c => (
                  <tr key={c.id} className="border-b border-border-subtle">
                    <td className="py-1.5 pr-3">
                      {c.property_id ? (
                        <PropertyLink propertyId={c.property_id} code={c.property_code || c.property_id} className="text-xs font-medium" siblingIds={allPropertyIds} />
                      ) : (
                        <span className="text-text-muted">{c.property_code || '—'}</span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-text-secondary truncate max-w-[180px]">
                      {c.properties?.address || c.properties?.area || '—'}
                    </td>
                    <td className="py-1.5 pr-2">
                      {c.properties?.transaction_type && (
                        <span className={`text-[9px] font-semibold rounded px-1.5 py-0.5 ${
                          c.properties.transaction_type === 'Πώληση'
                            ? 'bg-brand-blue/10 text-brand-blue'
                            : 'bg-brand-orange/10 text-brand-orange'
                        }`}>
                          {c.properties.transaction_type === 'Πώληση' ? 'Πώλ.' : 'Ενοικ.'}
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{fmtEur(c.price ?? c.properties?.price)}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums font-medium text-brand-gold">{fmtEur(c.gci)}</td>
                    <td className="py-1.5 text-right tabular-nums text-text-muted">{formatDateEL(c.closing_date)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Portfolio — active exclusives */}
      <div>
        <h3 className="text-sm font-semibold text-text-primary mb-2">
          Χαρτοφυλάκειο Ακινήτων ({portfolioItems.length})
        </h3>
        {portfolioItems.length === 0 ? (
          <p className="text-xs text-text-muted italic">Δεν υπάρχουν ενεργές αποκλειστικές</p>
        ) : (
          <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-card">
                <tr className="text-left text-text-muted border-b border-border-default">
                  <th className="pb-1.5 pr-3 font-medium">Κωδικός</th>
                  {isTeam && <th className="pb-1.5 pr-3 font-medium">Σύμβουλος</th>}
                  <th className="pb-1.5 pr-3 font-medium">Κατηγορία</th>
                  <th className="pb-1.5 pr-2 font-medium">Τύπος</th>
                  <th className="pb-1.5 pr-3 font-medium text-right">Τιμή</th>
                  <th className="pb-1.5 pr-3 font-medium text-right">Λήξη</th>
                  <th className="pb-1.5 font-medium">Περιοχή</th>
                </tr>
              </thead>
              <tbody>
                {portfolioItems.map(e => {
                  const p = e.properties;
                  const propId = e.property_id ?? p?.property_id;
                  const code = e.property_code || p?.property_code || propId || '—';
                  return (
                    <tr key={e.id} className="border-b border-border-subtle">
                      <td className="py-1.5 pr-3">
                        {propId ? (
                          <PropertyLink propertyId={propId} code={code} className="text-xs font-medium" siblingIds={allPropertyIds} />
                        ) : (
                          <span className="text-text-muted">{code}</span>
                        )}
                      </td>
                      {isTeam && (
                        <td className="py-1.5 pr-3 text-text-secondary truncate max-w-[100px]">
                          {e.agents?.canonical_name?.split(' ')[0] || '—'}
                        </td>
                      )}
                      <td className="py-1.5 pr-3 text-text-secondary">{p?.subcategory || p?.category || '—'}</td>
                      <td className="py-1.5 pr-2">
                        {p?.transaction_type && (
                          <span className={`text-[9px] font-semibold rounded px-1.5 py-0.5 ${
                            p.transaction_type === 'Πώληση'
                              ? 'bg-brand-blue/10 text-brand-blue'
                              : 'bg-brand-orange/10 text-brand-orange'
                          }`}>
                            {p.transaction_type === 'Πώληση' ? 'Πώλ.' : 'Ενοικ.'}
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 text-right tabular-nums">{fmtEur(p?.price)}</td>
                      <td className="py-1.5 pr-3 text-right tabular-nums text-text-muted">{formatDateEL(e.end_date)}</td>
                      <td className="py-1.5 text-text-secondary truncate max-w-[120px]">{p?.area || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Showings & Withdrawals row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center gap-2 text-sm text-text-secondary bg-surface rounded-lg p-3 border border-border-subtle">
          <span className="text-text-muted">Υποδείξεις:</span>
          <span className="font-bold text-brand-purple">{fmt(totalShowings)}</span>
          <span className="text-text-muted">σύνολο</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-text-secondary bg-surface rounded-lg p-3 border border-border-subtle">
          <span className="text-text-muted">Αποσύρσεις:</span>
          <span className="font-bold text-brand-red">{fmt(totalWithdrawals)}</span>
          <span className="text-text-muted">YTD {currentYear}</span>
        </div>
      </div>

      {/* Withdrawal reasons breakdown */}
      {allWithdrawalReasons.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">
            Λόγοι Απόσυρσης ({totalWithdrawals})
          </h3>
          <div className="space-y-1.5">
            {allWithdrawalReasons.map(([reason, cnt]) => (
              <div key={reason} className="flex items-center gap-2 text-xs">
                <span className="text-text-secondary flex-1">{reason}</span>
                <span className="font-semibold tabular-nums text-text-primary">{cnt}</span>
                <div className="w-24 h-1.5 bg-border-subtle rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-brand-red/60"
                    style={{ width: `${Math.min((cnt / totalWithdrawals) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TargetBar({ label, actual, target, color, formatter }: {
  label: string;
  actual: number;
  target: number;
  color: string;
  formatter: (n: number) => string;
}) {
  const pct = target > 0 ? Math.min((actual / target) * 100, 100) : 0;
  const overTarget = target > 0 && actual >= target;

  return (
    <div className="bg-surface rounded-lg p-3 border border-border-subtle">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-text-muted mb-1">{label}</div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <span className="text-sm font-bold" style={{ color }}>{formatter(actual)}</span>
        <span className="text-[10px] text-text-muted">/ {formatter(target)}</span>
      </div>
      <div className="w-full h-2 bg-border-subtle rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            backgroundColor: overTarget ? '#168F80' : color,
          }}
        />
      </div>
      <div className="text-[10px] text-text-muted mt-1 text-right">
        {pct.toFixed(0)}%
        {overTarget && <span className="text-brand-green ml-1 font-semibold">Επιτεύχθηκε</span>}
      </div>
    </div>
  );
}
