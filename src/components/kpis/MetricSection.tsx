import { useState, useMemo } from 'react';
import type { CombinedMetric, Team, TeamMember } from '../../lib/types';
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

const TAB_LABELS = [
  'Ανά Agent',
  'Ανά Team',
  'Γραφείο vs Γραφείο',
  'Peers Λάρισα',
  'Peers Κατερίνη',
  'vs Επιχείρηση',
  'Chart',
];

interface Props {
  def: KpiDef;
  metrics: CombinedMetric[];
  teams: Team[];
  teamMembers: TeamMember[];
}

export function MetricSection({ def, metrics, teams, teamMembers }: Props) {
  const [activeTab, setActiveTab] = useState(0);
  const hasAcc = def.accField !== null;

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
      />

      {/* Tab bar */}
      <div className="bg-white rounded-lg border border-[#DDD8D0] p-4">
        <div className="flex flex-wrap gap-1 mb-4">
          {TAB_LABELS.map((label, i) => (
            <button
              key={label}
              onClick={() => setActiveTab(i)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === i
                  ? 'bg-[#0C1E3C] text-white'
                  : 'text-[#8A94A0] hover:bg-[#F7F6F3] hover:text-[#0C1E3C]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Active tab content */}
        {renderTab()}
      </div>
    </div>
  );
}
