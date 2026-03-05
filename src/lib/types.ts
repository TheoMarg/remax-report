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
  crm_registrations_sale: number;
  crm_registrations_rent: number;
  crm_exclusives: number;
  crm_exclusives_residential: number;
  crm_exclusives_sale: number;
  crm_exclusives_rent: number;
  crm_published: number;
  crm_published_sale: number;
  crm_published_rent: number;
  crm_showings: number;
  crm_showings_sale: number;
  crm_showings_rent: number;
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

// ── Closing with Property (joined) ──

export interface ClosingWithProperty {
  id: number;
  agent_id: number | null;
  property_id: string | null;
  property_code: string | null;
  closing_date: string | null;
  closing_type: string | null;
  price: number | null;
  gci: number | null;
  source: string;
  properties: {
    property_id: string;
    address: string | null;
    area: string | null;
    category: string | null;
    subcategory: string | null;
    price: number | null;
    size_sqm: number | null;
    bedrooms: number | null;
    is_exclusive: boolean | null;
    first_pub_date: string | null;
    registration_date: string | null;
  };
}

// ── Showing ──

export interface Showing {
  id: number;
  agent_id: number | null;
  property_id: string | null;
  showing_date: string | null;
  client_name: string | null;
  manager_name: string | null;
}

// ── Stage Duration ──

export interface StageDuration {
  from: string;       // event_type
  to: string;         // event_type
  fromLabel: string;
  toLabel: string;
  days: number;
  fromDate: string;
  toDate: string;
}

// ── Stage Summary Row ──

export interface StageSummaryRow {
  from: string;
  to: string;
  label: string;
  avgDays: number;
  minDays: number;
  maxDays: number;
  count: number;
}

// ── Property Card Data ──

export interface PropertyCardData {
  closing: ClosingWithProperty;
  agentName: string;
  events: PropertyEvent[];
  showings: Showing[];
  stages: StageDuration[];
  totalDaysToClose: number | null;
  listToCloseRatio: number | null;
}

// ── Auth ──

export type UserRole = 'broker' | 'admin' | 'team_leader' | 'agent' | 'anon';

export interface UserProfile {
  role: UserRole;
  agentId: number | null;
  email: string;
}
