# RE/MAX Delta Ktima Dashboard — Knowledge Base

## Architecture Overview

```
CRM (RealStatus API)     Warehouse (SQLite)      Supabase (Postgres)       React Dashboard
+ Google Sheets      ──►  warehouse.sqlite    ──►  bpumfzwrmmolsilbjqjl  ──►  Vite + React
+ Excel Files             12 ETL collectors        supabase-py sync          supabase-js (anon)
                          (read-only)              (service_role)            @tanstack/react-query
```

- **ETL** runs weekly (Monday 07:00) via `run.py` → collects from 12 sources into SQLite
- **Sync** runs after ETL via `sync_to_supabase.py` → batch upserts to Supabase (chunks of 1000)
- **Dashboard** queries Supabase views with the anon key (RLS enforced, broker role = full access)
- All data is **read-only** from CRM; the warehouse is the single source of truth

---

## Supabase Tables

### Core
| Table | PK | Description |
|-------|-----|-------------|
| `agents` | agent_id INT | Canonical agents — canonical_name, office (katerini/larisa), is_active, is_team, phone, email, start_date |
| `teams` | team_id INT | Team definitions — team_name, crm_team_name |
| `team_members` | (team_id, agent_id) | Team membership with role |

### Properties
| Table | PK | Description |
|-------|-----|-------------|
| `properties` | property_id TEXT | Main property records — property_code, crm_code, agent_id FK, category, subcategory, area, region, prefecture, address, price, size_sqm, plot_sqm, bedrooms, floor, year_built, energy_class, is_exclusive, exclusive_start/end, is_retired, retirement_date, retirement_reason, days_on_market, first_pub_date, lat, lng, broker_code, registration_date, **transaction_type** ("Πώληση"/"Ενοικίαση"), first_seen_at, last_seen_at |
| `status_changes` | (property_id, changed_at, event_type) | Property state transitions — event_type: activation, deactivation, deposit, closing_ours, etc. |
| `price_changes` | (property_id, changed_at) | Price history — old_price, new_price, change_eur, change_pct |
| `exclusives` | (property_code, agent_id, sign_date) | Exclusive mandates — end_date, status, owner_name, source (gsheet/excel) |
| `ypodikseis` | (property_code, showing_date, client_name) | Property showings — manager_name, agent_id |
| `closings` | (property_code, closing_date) | Closed transactions — closing_type, price, gci, agent_id, source |
| `offers` | auto ID | Offers — property_code, agent_id, offer_date, offer_amount, status |
| `portal_publications` | auto ID | CRM publication events — property_code, event_type (publish/unpublish), portal_name, sale_rent |

### Performance & Reporting
| Table | PK | Description |
|-------|-----|-------------|
| `accountability_reports` | (agent_id, report_date) | Weekly self-reports — 60+ activity metrics (listings, meetings, showings, offers, closings, etc.) |
| `billing_transactions` | (office, billing_month, seq_num) | Commission records — agent_id, gci, property_code, is_rental, seller_name, buyer_name |
| `targets_annual` | (agent_id, year, source) | Annual targets — gci_target, gci_realistic, exclusives_target |
| `gci_monthly` | (agent_id, month) | Monthly GCI from GrowthCFO Google Sheet |
| `dashboard_history` | (agent_id, month) | Historical plan vs actual (from Excel dashboards, legacy) |

---

## Supabase Views

### Monthly Aggregation Views (used by `v_combined_metrics`)
| View | Description |
|------|-------------|
| `v_monthly_registrations` | New properties by registration_date per agent per month |
| `v_monthly_exclusives` | Exclusive contracts signed (deduped: gsheet > excel) |
| `v_monthly_published` | Published properties per agent (from portal_publications, with sale/rent split) |
| `v_monthly_showings` | Showing count per agent per month |
| `v_monthly_offers` | Offer count per agent per month |
| `v_monthly_closings` | Properties closed (event_type = closing_ours) |
| `v_monthly_billing` | Billing transaction count + GCI sum |
| `v_monthly_gci` | **3-layer priority GCI**: billing_transactions > gci_monthly > dashboard_history |
| `v_monthly_acc_metrics` | Accountability aggregations (CRM-independent, self-reported metrics) |
| `v_monthly_crm_metrics` | Withdrawals and offers from CRM data |

### Master Dashboard View
| View | Description |
|------|-------------|
| `v_combined_metrics` | **Primary view for the dashboard** — joins ALL monthly views into one row per (agent, month). Fields: crm_registrations, crm_exclusives, crm_published, crm_showings, crm_offers, crm_closings, crm_billing, crm_gci + acc_ variants + sale/rent splits + agent info (canonical_name, office, is_team, team_id, team_name) |

### Property & Closing Detail Views
| View | Description |
|------|-------------|
| `v_valid_closings` | Only closings where the property's LAST status event is 'closing_ours' (excludes subsequently deactivated) |
| `v_property_events_timeline` | Unified timeline per property: registration, activation, exclusive, published, price_change, deposit, deactivation, closing, showing, notarization |
| `v_exclusives_residential_detail` | Residential exclusives per agent per property subcategory per month (for 4-Club) |

### Funnel & Withdrawal Views
| View | Description |
|------|-------------|
| `v_funnel_by_type` | Pipeline conversion by property subcategory: registrations → exclusives → published → showings → closings |
| `v_withdrawal_reasons` | Parsed withdrawal reasons per agent per month (Σε εκκρεμότητα, Ανενεργό, Άρση εντολής, etc.) — includes both deactivation AND closing events |

---

## React App Structure

### Tech Stack
- React 18 + TypeScript + Vite
- TailwindCSS (custom theme)
- @tanstack/react-query (1hr staleTime)
- supabase-js (anon key, RLS)
- Framer Motion (animations)
- Recharts (charts)
- html2pdf.js (PDF export)

### Pages (7)
| Page | Greek Name | Key Components | Data Hooks |
|------|-----------|----------------|------------|
| **Overview** | Σύνοψη | KpiCards, TopPerformers, SalesFunnel, OfficeComparison, TrendChart | useMetrics, useTrend |
| **KPIDetail** | KPIs | KpiSelector, AgentRankTab, TeamBreakdownTab, OfficeVsOfficeTab, ChartTab, FourClubSection | useMetrics |
| **Withdrawals** | Αποσύρσεις | WithdrawalCards, ReasonBreakdown, WithdrawalChart, WithdrawalTeamBreakdown | useWithdrawals |
| **Funnel** | Funnel | FunnelTable, FunnelBarChart, FunnelNarrative | useFunnel |
| **Properties** | Ακίνητα | StageSummary, PropertyCard, PropertyTimeline, PropertyShowings | useClosings |
| **CrmVsAcc** | CRM vs ACC | CrmVsAccChart, DeviationTable, CrmVsAccNarrative, DataSourceTable | useMetrics |
| **GciRankings** | Τζίρος | GciChart, GciRankTable, GciOfficeTable | useMetrics |

### Navigation
- **Header**: Brand logo, period selector (Month/Quarter/Year), year selector, search (Ctrl+K)
- **PageNav**: 7 horizontal tabs
- **SearchPalette**: Command palette — searches agents by name + properties by code/address (debounced 300ms)

### Data Hooks
| Hook | Supabase Source | Returns |
|------|----------------|---------|
| `useMetrics(period)` | `v_combined_metrics` filtered by date + ALLOWED_AGENT_IDS | CombinedMetric[] |
| `useTrend(period)` | `v_combined_metrics` (6 months) | CombinedMetric[] |
| `useClosings(period)` | `v_valid_closings` + `v_property_events_timeline` + `ypodikseis` | closings, events, showings |
| `useFunnel(period)` | `v_funnel_by_type` | FunnelRow[] |
| `useWithdrawals(period)` | `v_withdrawal_reasons` | WithdrawalReason[] |
| `useAgents()` | `agents` | Agent[] |
| `useTeams()` | `teams` | Team[] |
| `useTeamMembers()` | `team_members` | TeamMember[] |
| `usePropertyDetail(id)` | `properties` + `agents` + `v_property_events_timeline` + `ypodikseis` + `price_changes` + `exclusives` + `v_valid_closings` | Full property detail |
| `useAgentDetail(id)` | `agents` + `v_combined_metrics` + `v_valid_closings` + `exclusives` + `ypodikseis` + `targets_annual` + `v_withdrawal_reasons` | Full agent detail |

### Modal System (360° Views)
- **Modal360Context** (React Context) manages open/close state
- **Agent360Content**: Profile, metrics history, recent closings, portfolio, showings, targets, withdrawals
- **Property360Content**: Specs, event timeline, showings, price history, exclusive details, closing info
- **Navigation**: Prev/Next arrows + arrow keys for browsing lists, ESC to close
- **AgentLink** / **PropertyLink**: Clickable inline components that open modals

### Key Computation Files
| File | Purpose |
|------|---------|
| `lib/metrics.ts` (830+ lines) | All KPI computations: rankings, team breakdowns, office comparisons, funnel, GCI, 4-Club |
| `lib/propertyMetrics.ts` | Stage durations, property card assembly, stage summaries |
| `lib/constants.ts` | ALLOWED_AGENT_IDS, TEAM_VIRTUAL_AGENTS mapping |
| `lib/types.ts` | All TypeScript interfaces |

---

## 7 KPIs Tracked

| # | KPI | Greek | Color | CRM Source | ACC Source |
|---|-----|-------|-------|------------|------------|
| 1 | Registrations | Καταγραφές | blue | registration_date events | acc listings |
| 2 | Exclusives | Νέες Αποκλειστικές | teal | exclusives table (deduped) | acc exclusives |
| 3 | Published | Νέα Δημοσιευμένα | green | portal_publications | — |
| 4 | Showings | Υποδείξεις | purple | ypodikseis table | acc showings |
| 5 | Offers | Προσφορές | orange | offers table | acc offers |
| 6 | Closings | Κλεισίματα | orange-red | closing_ours events | acc closings |
| 7 | Billing | Συμβολαιοποιήσεις | navy | billing_transactions | acc transactions |

Each KPI shows: CRM value, ACC value, Delta (CRM−ACC), Sale/Rent split.

---

## Business Logic & Important Patterns

### Offices & Agent Filtering
- Two offices: **katerini** and **larisa**
- **NEVER filter by region** — agents work across 20+ regions
- **ALWAYS filter by `agents.office`** or the ALLOWED_AGENT_IDS list
- Katerini agents (8): Ταραντίλης, Κυριακίδου, Παπαδόπουλος Δ., Βασιλείου, Οικονόμου, Παπαδόπουλος Κ., Λιόλιος, Γιάντσιου-Καραλιά

### Teams (Virtual Agent IDs)
- Team Γιαννακός → agent_id 33
- Team Δερβένης → agent_id 34
- Team Γκουγκούδης → agent_ids 35, 103
- Teams aggregate member metrics; virtual agent_id used in views

### GCI Priority (3-layer)
1. `billing_transactions` — individual commission records (highest priority)
2. `gci_monthly` — monthly actuals from GrowthCFO Google Sheet
3. `dashboard_history` — legacy Excel data (lowest priority, fallback only)

### Closing Validation
- Only `event_type = 'closing_ours'` counts as a real closing
- `v_valid_closings` checks that the property's LAST status is still 'closing_ours' (not subsequently deactivated)
- Google Sheet closings excluded from sync (unreliable batch import dates)

### "New Publications" Logic
- `first_pub_date` in period = first-time publication
- `activation` event in period with older first_pub_date = re-publication
- EXCLUDE activations deactivated the SAME DAY (not real publications)

### Exclusive Deduplication
- Google Sheet source (post Jan 15 2026) preferred over Excel
- Count distinct property_code per (agent, month)

### Withdrawal Categories
- **Passive** (Σε εκκρεμότητα, Ανενεργό) — owner-side
- **Active** (Άρση εντολής, Λήξη εντολής) — contract-based
- **Closings** (closing_ours events also appear in withdrawal view)

### 4-Club
- Tracks residential exclusives (houses + apartments only)
- Goal: 4+ residential sale exclusives per month
- Uses `v_exclusives_residential_detail` view

---

## Authentication & Authorization

- Supabase Auth with email/password
- Roles: **broker** (full access), **admin**, **team_leader**, **agent**, **anon**
- RLS enabled on ALL tables
- Broker/admin: SELECT * (unrestricted)
- Service role: bypasses RLS (sync scripts only)
- Frontend filters by ALLOWED_AGENT_IDS regardless (hardcoded list)

---

## Component Directory

```
src/
├── App.tsx                              # Router (activePage state)
├── index.css                            # Tailwind + custom theme
├── lib/
│   ├── supabase.ts                      # Supabase client init
│   ├── types.ts                         # All interfaces
│   ├── metrics.ts                       # KPI computations (830+ lines)
│   ├── propertyMetrics.ts               # Property stage logic
│   └── constants.ts                     # ALLOWED_AGENT_IDS, teams
├── hooks/
│   ├── useAuth.ts                       # Session + profile
│   ├── usePeriod.ts                     # Period state
│   ├── useMetrics.ts                    # v_combined_metrics
│   ├── useTrend.ts                      # 6-month trend
│   ├── useClosings.ts                   # Valid closings + events
│   ├── useFunnel.ts                     # Funnel by type
│   ├── useWithdrawals.ts               # Withdrawal reasons
│   ├── useAgents.ts                     # Agents + teams
│   ├── usePropertyDetail.ts            # Full property data
│   └── useAgentDetail.ts               # Full agent data
├── contexts/
│   └── Modal360Context.tsx              # Global modal state
├── pages/
│   ├── Overview.tsx
│   ├── KPIDetail.tsx
│   ├── Withdrawals.tsx
│   ├── Funnel.tsx
│   ├── Properties.tsx
│   ├── CrmVsAcc.tsx
│   └── GciRankings.tsx
├── components/
│   ├── layout/          (Header, PageNav, Footer)
│   ├── overview/        (KpiCards, TopPerformers, SalesFunnel, OfficeComparison, TrendChart)
│   ├── kpis/            (KpiSelector, MetricSection, ChartTab, AgentRankTab, TeamBreakdownTab, OfficeVsOfficeTab, VsCompanyTab, FourClubSection)
│   ├── withdrawals/     (WithdrawalCards, ReasonBreakdown, WithdrawalChart, WithdrawalTeamBreakdown)
│   ├── funnel/          (FunnelTable, FunnelBarChart, FunnelNarrative)
│   ├── properties/      (StageSummary, PropertyCard, PropertyTimeline, PropertyShowings)
│   ├── crm-vs-acc/      (CrmVsAccChart, DeviationTable, CrmVsAccNarrative, DataSourceTable)
│   ├── gci/             (GciChart, GciRankTable, GciOfficeTable)
│   ├── modals/          (Modal360Shell, Agent360Content, Property360Content)
│   ├── search/          (SearchPalette)
│   ├── ui/              (AgentLink, PropertyLink)
│   ├── export/          (ExportPdfButton)
│   └── animations/      (AnimatedSection)
```

---

## Supabase Connection

- **Project**: bpumfzwrmmolsilbjqjl
- **Region**: eu-central-1
- **API URL**: https://bpumfzwrmmolsilbjqjl.supabase.co
- **Frontend uses**: VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY (env vars)
- **All queries go through RLS** — the anon key is safe to expose
