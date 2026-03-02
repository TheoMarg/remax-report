// ── Agents & Teams ──

export interface Agent {
  agent_id: number;
  canonical_name: string;
  first_name: string | null;
  last_name: string | null;
  office: string | null;
  is_active: boolean;
  is_team: boolean;
}

export interface Team {
  team_id: number;
  team_name: string;
  crm_team_name: string | null;
}

export interface TeamMember {
  team_id: number;
  agent_id: number;
  role: string | null;
}

// ── Combined Metrics (from v_combined_metrics view) ──

export interface CombinedMetric {
  period_start: string;         // 'YYYY-MM-DD'
  agent_id: number;
  canonical_name: string | null;
  office: string | null;
  is_team: boolean | null;
  team_id: number | null;
  team_name: string | null;
  // CRM
  crm_registrations: number;
  crm_exclusives: number;
  crm_exclusives_residential: number;
  crm_published: number;
  crm_showings: number;
  crm_withdrawals: number;
  crm_offers: number;
  crm_closings: number;
  crm_billing: number;
  gci: number;
  // ACC
  acc_registrations: number;
  acc_exclusives: number;
  acc_showings: number;
  acc_offers: number;
  acc_closings: number;
  acc_billing: number;
}

// ── Funnel ──

export interface FunnelRow {
  period_start: string;
  subcategory: string;
  registrations: number;
  exclusives: number;
  published: number;
  showings: number;
  closings: number;
}

// ── Withdrawal Reasons ──

export interface WithdrawalReason {
  period_start: string;
  agent_id: number;
  reason: string;
  cnt: number;
}

// ── Property Events Timeline ──

export interface PropertyEvent {
  property_id: string;
  event_date: string;
  event_type: string;
  detail: string | null;
  amount: number | null;
}

// ── Closing ──

export interface Closing {
  id: number;
  agent_id: number | null;
  property_id: string | null;
  property_code: string | null;
  closing_date: string | null;
  closing_type: string | null;
  price: number | null;
  gci: number | null;
  source: string;
}

// ── Sync Log ──

export interface SyncLog {
  id: number;
  started_at: string;
  ended_at: string | null;
  status: string;
}

// ── Period ──

export type PeriodType = 'week' | 'month' | 'quarter' | 'year';

export interface Period {
  type: PeriodType;
  start: string;   // 'YYYY-MM-DD' (1st of month)
  end: string;     // 'YYYY-MM-DD' (1st of month)
  label: string;   // 'Φεβρουάριος 2026' / 'Q1 2026' / '2026'
}

// ── Auth ──

export type UserRole = 'broker' | 'admin' | 'team_leader' | 'agent' | 'anon';

export interface UserProfile {
  role: UserRole;
  agentId: number | null;
  email: string;
}
