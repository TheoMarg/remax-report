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

  // Header data
  const crm = useMemo(() => sumField(individuals, def.crmField as keyof CombinedMetric), [individuals, def]);
  const acc = useMemo(
    () => (def.accField ? sumField(individuals, def.accField as keyof CombinedMetric) : 0),
    [individuals, def],
  );
  const officeBreakdown = useMemo(
    () => computeOfficeKpiComparison(metrics, def.crmField, def.accField),
    [metrics, def],
  );

  // Tab data (lazy — only compute what's needed)
  const allAgents = useMemo(
    () => rankAgentsByKpi(metrics, def.crmField, def.accField),
    [metrics, def],
  );
  const companyAvg = useMemo(
    () => computeCompanyAvg(metrics, def.crmField),
    [metrics, def],
  );
  const teamBreakdown = useMemo(
    () => computeTeamBreakdown(metrics, teams, teamMembers, def.crmField, def.accField),
    [metrics, teams, teamMembers, def],
  );
  const peersLarissa = useMemo(
    () => rankAgentsByKpi(metrics, def.crmField, def.accField, 'larissa'),
    [metrics, def],
  );
  const peersKaterini = useMemo(
    () => rankAgentsByKpi(metrics, def.crmField, def.accField, 'katerini'),
    [metrics, def],
  );

  // Office averages for peers tabs
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
      case 0:
        return <AgentRankTab agents={allAgents} hasAcc={hasAcc} companyAvg={companyAvg} />;
      case 1:
        return <TeamBreakdownTab teams={teamBreakdown} hasAcc={hasAcc} />;
      case 2:
        return <OfficeVsOfficeTab offices={officeBreakdown} hasAcc={hasAcc} />;
      case 3:
        return <PeersTab agents={peersLarissa} hasAcc={hasAcc} officeAvg={larissaAvg} officeName="larissa" />;
      case 4:
        return <PeersTab agents={peersKaterini} hasAcc={hasAcc} officeAvg={kateriniAvg} officeName="katerini" />;
      case 5:
        return <VsCompanyTab agents={allAgents} companyAvg={companyAvg} />;
      case 6:
        return <ChartTab agents={allAgents} hasAcc={hasAcc} companyAvg={companyAvg} />;
      case 7:
        return isExclusives ? <FourClubSection period={period} metrics={metrics} /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <MetricHeader
        def={def}
        crm={crm}
        acc={acc}
        delta={crm - acc}
        officeBreakdown={officeBreakdown}
        totalAgents={allAgents.length}
        companyAvg={companyAvg}
      />

      {/* Tab bar */}
      <div className="bg-white rounded-lg border border-[#DDD8D0] p-4">
        <div className="flex flex-wrap gap-1 mb-4">
          {tabLabels.map((label, i) => {
            const isFourClub = label === FOUR_CLUB_TAB;
            return (
              <button
                key={label}
                onClick={() => setActiveTab(i)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  isFourClub ? 'font-bold' : 'font-medium'
                } ${
                  activeTab === i
                    ? 'bg-[#0C1E3C] text-white'
                    : isFourClub
                    ? 'text-[#0C1E3C] bg-[#E2EFDA] hover:bg-[#C6EFCE]'
                    : 'text-[#8A94A0] hover:bg-[#F7F6F3] hover:text-[#0C1E3C]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Active tab content */}
        {renderTab()}
      </div>
    </div>
  );
}
