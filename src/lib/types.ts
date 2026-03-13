// ── Agents & Teams ──

export interface Agent {
  agent_id: number;
  canonical_name: string;
  first_name: string | null;
  last_name: string | null;
  office: string | null;
  is_active: boolean;
  is_team: boolean;
  phone: string | null;
  email: string | null;
  start_date: string | null;
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
  crm_offers_sale: number;
  crm_offers_rent: number;
  crm_closings: number;
  crm_closings_sale: number;
  crm_closings_rent: number;
  crm_billing: number;
  crm_billing_sale: number;
  crm_billing_rent: number;
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
  agentId: number | null;
  events: PropertyEvent[];
  showings: Showing[];
  stages: StageDuration[];
  totalDaysToClose: number | null;
  listToCloseRatio: number | null;
}

// ── 360 Modal Types ──

export interface PropertyDetail {
  property_id: string;
  property_code: string | null;
  address: string | null;
  area: string | null;
  category: string | null;
  subcategory: string | null;
  price: number | null;
  size_sqm: number | null;
  bedrooms: number | null;
  floor: string | null;
  year_built: number | null;
  energy_class: string | null;
  is_exclusive: boolean | null;
  is_retired: boolean | null;
  retirement_reason: string | null;
  first_pub_date: string | null;
  registration_date: string | null;
  agent_id: number | null;
  transaction_type: string | null;
  days_on_market: number | null;
}

export interface PriceChange {
  id: number;
  property_id: string;
  change_date: string;
  old_price: number | null;
  new_price: number | null;
  change_eur: number | null;
  change_pct: number | null;
}

export interface ExclusiveDetail {
  id: number;
  property_id: string;
  owner_name: string | null;
  sign_date: string | null;
  end_date: string | null;
}

// ── v2: Property Journey (from v_property_journey) ──

export interface PropertyJourney {
  property_id: string;
  property_code: string | null;
  agent_id: number;
  category: string | null;
  subcategory: string | null;
  listing_price: number | null;
  size_sqm: number | null;
  area: string | null;
  region: string | null;
  floor: string | null;
  year_built: number | null;
  is_retired: boolean;
  first_pub_date: string | null;
  days_on_market: number | null;
  office: string | null;
  canonical_name: string | null;
  agent_start_date: string | null;
  is_team: boolean;

  // Milestone dates
  dt_registration: string | null;
  dt_exclusive: string | null;
  dt_published: string | null;
  dt_first_showing: string | null;
  dt_offer: string | null;
  dt_closing: string | null;

  // Milestone flags
  has_registration: boolean;
  has_exclusive: boolean;
  has_published: boolean;
  has_showing: boolean;
  has_offer: boolean;
  has_closing: boolean;

  // Days between stages
  days_reg_to_excl: number | null;
  days_excl_to_offer: number | null;
  days_offer_to_closing: number | null;
  days_excl_to_closing: number | null;
  days_total_journey: number | null;

  // Showing enrichment
  total_showings: number;
  unique_clients: number;

  // Price quality
  closing_price: number | null;
  price_delta_pct: number | null;
  gci: number | null;
  price_reduction_count: number;
}

// ── v2: Active Exclusives (from v_active_exclusives) ──

export interface ActiveExclusive {
  id: number;
  agent_id: number;
  property_id: string;
  property_code: string | null;
  subcategory: string | null;
  category: string | null;
  price: number | null;
  area: string | null;
  region: string | null;
  sign_date: string | null;
  end_date: string | null;
  days_active: number;
}

// ── v2: Portfolio Quality (from v_portfolio_quality) ──

export interface PortfolioQuality {
  agent_id: number;
  canonical_name: string;
  office: string;
  total_properties: number;
  active_exclusives: number;
  exclusive_ratio: number;
  avg_days_on_market: number;
  avg_showings_per_property: number;
  pct_with_showings: number;
  avg_price_reductions: number;
  pct_with_offer: number;
}

// ── v2: Agent Activity (from v_agent_activity) ──

export interface AgentActivity {
  period_start: string;
  agent_id: number;
  total_cold_calls: number;
  total_follow_ups: number;
  total_digital_outreach: number;
  total_social: number;
  total_meetings: number;
  total_leads: number;
  total_leads_in_person: number;
  total_cultivation: number;
  total_8x8: number;
  total_33touches: number;
  total_marketing_actions: number;
  total_open_houses: number;
  total_cooperations: number;
  total_referrals: number;
  total_absences: number;
}

// ── v2: Pipeline Value (from v_pipeline_value) ──

export interface PipelineValue {
  agent_id: number;
  canonical_name: string;
  office: string;
  active_properties: number;
  total_listing_value: number;
  exclusive_value: number | null;
  with_showings: number;
  with_offers: number;
  offer_pipeline_value: number | null;
}

// ── v2: Pricing Benchmark (from v_pricing_benchmark) ──

export interface PricingBenchmark {
  area: string;
  subcategory: string;
  category: string;
  property_count: number;
  avg_eur_per_sqm: number;
  median_eur_per_sqm: number;
  min_eur_per_sqm: number;
  max_eur_per_sqm: number;
}

// ── v2: Property Pricing (from v_property_pricing) ──

export interface PropertyPricing {
  property_id: string;
  property_code: string | null;
  agent_id: number;
  canonical_name: string | null;
  office: string | null;
  category: string | null;
  subcategory: string | null;
  area: string | null;
  region: string | null;
  transaction_type: string | null;
  price: number | null;
  size_sqm: number | null;
  bedrooms: number | null;
  floor: string | null;
  year_built: number | null;
  energy_class: string | null;
  is_retired: boolean;
  is_exclusive: boolean | null;
  first_pub_date: string | null;
  registration_date: string | null;
  days_on_market: number | null;
  lat: number | null;
  lng: number | null;
  eur_per_sqm: number | null;
  condition: string;
  year_band: string;
  sqm_band: string;
  showing_count: number;
  price_reduction_count: number;
  days_published: number | null;
  has_active_exclusive: boolean;
}

// ── v2: Closing Pricing (from v_closing_pricing) ──

export interface ClosingPricing {
  closing_id: number;
  property_id: string;
  property_code: string | null;
  agent_id: number;
  canonical_name: string | null;
  office: string | null;
  closing_date: string;
  closing_type: string | null;
  closing_price: number | null;
  gci: number | null;
  category: string | null;
  subcategory: string | null;
  area: string | null;
  region: string | null;
  size_sqm: number | null;
  floor: string | null;
  year_built: number | null;
  listing_price: number | null;
  eur_per_sqm: number | null;
  price_delta_pct: number | null;
  condition: string;
  year_band: string;
  sqm_band: string;
  days_on_market: number | null;
}

// ── v2: Stuck Alerts (from v_stuck_alerts) ──

export interface StuckAlert {
  property_id: string;
  property_code: string | null;
  agent_id: number;
  canonical_name: string | null;
  office: string | null;
  subcategory: string | null;
  category: string | null;
  current_stage: string;
  days_since_activity: number;
  last_activity_date: string;
  office_avg_days: number;
  days_over_avg: number;
}

// ── v2: KPI Weights (from kpi_weights table) ──

export interface KpiWeight {
  id: number;
  metric_key: string;
  weight: number;
  updated_by: string | null;
  updated_at: string;
}

// ── v2: PQS Weights (from pqs_weights table) ──

export interface PqsWeight {
  id: number;
  metric_key: string;
  weight: number;
  updated_by: string | null;
  updated_at: string;
}

// ── v2: Agent Targets (from targets_annual table) ──

export interface AgentTarget {
  id: number;
  agent_id: number;
  year: number;
  office: string | null;
  gci_target: number | null;
  gci_realistic: number | null;
  exclusives_target: number | null;
  source: string | null;
}

// ── v2: Entity Reference (for 360° modal navigation) ──

export interface EntityRef {
  type: 'agent' | 'office' | 'team' | 'property';
  id: string | number;
  label: string;
}

// ── Auth ──

export type UserRole = 'broker' | 'performance_mgr' | 'ops_mgr' | 'admin' | 'team_leader' | 'agent' | 'anon';

export interface UserProfile {
  role: UserRole;
  agentId: number | null;
  email: string;
}
