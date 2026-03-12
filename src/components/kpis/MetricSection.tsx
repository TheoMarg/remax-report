import { useState, useMemo } from 'react';
import type { CombinedMetric, Team, TeamMember, Period } from '../../lib/types';
import type { KpiDef } from '../../lib/metrics';
import {
  rankAgentsByKpi,
  computeTeamBreakdown,
  computeOfficeKpiComparison,
  computeCompanyAvg,
  sumField,
  individualsOnly,
} from '../../lib/metrics';
import { MetricHeader } from './MetricHeader';
import { AgentRankTab } from './AgentRankTab';
import { TeamBreakdownTab } from './TeamBreakdownTab';
import { OfficeVsOfficeTab } from './OfficeVsOfficeTab';
import { PeersTab } from './PeersTab';
import { VsCompanyTab } from './VsCompanyTab';
import { ChartTab } from './ChartTab';
import { FourClubSection } from './FourClubSection';

const BASE_TABS = [
  'Ανά Agent',
  'Ανά Team',
  'Γραφείο vs Γραφείο',
  'Peers Λάρισα',
  'Peers Κατερίνη',
  'vs Επιχείρηση',
  'Chart',
];

const FOUR_CLUB_TAB = '4+ Οικιστικές Αποκλειστικές';

interface Props {
  def: KpiDef;
  metrics: CombinedMetric[];
  teams: Team[];
  teamMembers: TeamMember[];
  period: Period;
}

export function MetricSection({ def, metrics, teams, teamMembers, period }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const hasAcc = def.accField !== null;
  const isExclusives = def.key === 'exclusives';
  const tabLabels = isExclusives ? [...BASE_TABS, FOUR_CLUB_TAB] : BASE_TABS;

  const individuals = useMemo(() => individualsOnly(metrics), [metrics]);
  const crm = useMemo(() => sumField(individuals, def.crmField as keyof CombinedMetric), [individuals, def]);
  const acc = useMemo(
    () => (def.accField ? sumField(individuals, def.accField as keyof CombinedMetric) : 0),
    [individuals, def],
  );
  const officeBreakdown = useMemo(() => computeOfficeKpiComparison(metrics, def.crmField, def.accField), [metrics, def]);
  const allAgents = useMemo(() => rankAgentsByKpi(metrics, def.crmField, def.accField), [metrics, def]);
  const companyAvg = useMemo(() => computeCompanyAvg(metrics, def.crmField), [metrics, def]);
  const teamBreakdown = useMemo(() => computeTeamBreakdown(metrics, teams, teamMembers, def.crmField, def.accField), [metrics, teams, teamMembers, def]);
  const peersLarissa = useMemo(() => rankAgentsByKpi(metrics, def.crmField, def.accField, 'larissa'), [metrics, def]);
  const peersKaterini = useMemo(() => rankAgentsByKpi(metrics, def.crmField, def.accField, 'katerini'), [metrics, def]);

  const larissaAvg = useMemo(() => {
    const o = officeBreakdown.find(o => o.office === 'larissa');
    return o ? o.moPerAgent : 0;
  }, [officeBreakdown]);
  const kateriniAvg = useMemo(() => {
    const o = officeBreakdown.find(o => o.office === 'katerini');
    return o ? o.moPerAgent : 0;
  }, [officeBreakdown]);

  const renderTab = () => {
    switch (activeTab) {
      case 0: return <AgentRankTab agents={allAgents} hasAcc={hasAcc} companyAvg={companyAvg} kpiColor={def.color} />;
      case 1: return <TeamBreakdownTab teams={teamBreakdown} hasAcc={hasAcc} kpiColor={def.color} />;
      case 2: return <OfficeVsOfficeTab offices={officeBreakdown} hasAcc={hasAcc} />;
      case 3: return <PeersTab agents={peersLarissa} hasAcc={hasAcc} officeAvg={larissaAvg} officeName="larissa" />;
      case 4: return <PeersTab agents={peersKaterini} hasAcc={hasAcc} officeAvg={kateriniAvg} officeName="katerini" />;
      case 5: return <VsCompanyTab agents={allAgents} companyAvg={companyAvg} />;
      case 6: return <ChartTab agents={allAgents} hasAcc={hasAcc} companyAvg={companyAvg} />;
      case 7: return isExclusives ? <FourClubSection period={period} metrics={metrics} /> : null;
      default: return null;
    }
  };

  return (
    <div className="space-y-5">
      <MetricHeader
        def={def}
        crm={crm}
        acc={acc}
        delta={crm - acc}
        officeBreakdown={officeBreakdown}
        totalAgents={allAgents.length}
        companyAvg={companyAvg}
      />

      <div className="card-premium p-5">
        <div className="flex flex-wrap gap-1.5 mb-5 pb-4 border-b border-border-subtle">
          {tabLabels.map((label, i) => {
            const isFourClub = label === FOUR_CLUB_TAB;
            return (
              <button
                key={label}
                onClick={() => setActiveTab(i)}
                className={`px-3.5 py-2 text-xs rounded-lg transition-all duration-200 ${
                  isFourClub ? 'font-bold' : 'font-medium'
                } ${
                  activeTab === i
                    ? 'bg-navy text-white shadow-md'
                    : isFourClub
                    ? 'text-text-primary bg-brand-green/10 hover:bg-brand-green/20'
                    : 'text-text-muted hover:bg-surface hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {renderTab()}
      </div>
    </div>
  );
}
