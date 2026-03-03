import { useMemo } from 'react';
import type { Period } from '../lib/types';
import { useWithdrawals } from '../hooks/useWithdrawals';
import { useTeams, useTeamMembers } from '../hooks/useAgents';
import { computeWithdrawalSummary, computeWithdrawalsByTeam } from '../lib/metrics';
import { WithdrawalCards } from '../components/withdrawals/WithdrawalCards';
import { ReasonBreakdown } from '../components/withdrawals/ReasonBreakdown';
import { WithdrawalChart } from '../components/withdrawals/WithdrawalChart';
import { WithdrawalTeamBreakdown } from '../components/withdrawals/WithdrawalTeamBreakdown';

interface Props {
  period: Period;
}

export function Withdrawals({ period }: Props) {
  const { data: rows, isLoading, error } = useWithdrawals(period);
  const { data: teams } = useTeams();
  const { data: teamMembers } = useTeamMembers();

  const categories = useMemo(
    () => (rows ? computeWithdrawalSummary(rows) : []),
    [rows],
  );

  const teamBreakdown = useMemo(
    () => (rows && teams && teamMembers
      ? computeWithdrawalsByTeam(rows, teams, teamMembers)
      : []),
    [rows, teams, teamMembers],
  );

  const totalCount = useMemo(
    () => (rows ? rows.reduce((s, r) => s + r.cnt, 0) : 0),
    [rows],
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#1B5299] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#8A94A0]">Φόρτωση δεδομένων...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-[#DC3545]/10 border border-[#DC3545]/20 rounded-lg p-4">
          <span className="text-sm text-[#DC3545]">
            Σφάλμα φόρτωσης: {error instanceof Error ? error.message : JSON.stringify(error)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* Title + total */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold text-[#0C1E3C]">
          Αποσύρσεις από το CRM — {period.label}
        </h2>
        <span className="text-sm text-[#8A94A0]">
          Σύνολο: <span className="font-bold text-[#0C1E3C]">{totalCount.toLocaleString('el-GR')}</span>
        </span>
      </div>

      {/* 3 Category Cards */}
      <WithdrawalCards categories={categories} />

      {/* Horizontal bar breakdown */}
      <ReasonBreakdown rows={rows ?? []} />

      {/* Pie chart + Team breakdown side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <WithdrawalChart categories={categories} />
        <WithdrawalTeamBreakdown teams={teamBreakdown} />
      </div>
    </div>
  );
}
