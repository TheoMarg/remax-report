# RE/MAX Delta Ktima — Report Hub v2 Master Plan

**Version:** 2.1-consolidated
**Date:** March 2026
**Author:** Operations Manager (Theodoros Margomenos)

---

## Table of Contents

1. Vision & Architecture
2. Roles & Access
3. Core Data Model: Property Journey
4. Weighted Scoring Systems (WPS + PQS)
5. Labels & Design Language
6. Pages & Features (13 pages + 360 Modal)
7. Page 1: Overview
8. Page 2: Pipeline (5 stage tabs)
9. Page 3: KPIs (7+1 tabs)
10. Page 4: Leaderboard
11. Page 5: Portfolio — Published Properties
12. Page 6: Portfolio — Quality (PQS)
13. Page 7: Pricing Intelligence
14. Page 8: Accountability
15. Page 9: Withdrawals
16. Page 10: Agent Profile
17. Page 11: Insights
18. Page 12: Reports (ops_mgr only)
19. Page 13: Settings (ops_mgr only)
20. 360° Modal System
21. Universal Patterns & Shared Components
22. Postgres Views (complete list with SQL)
23. New Tables (complete list with SQL)
24. React Hooks
25. Development Cycles
26. Reused v1 Components
27. Tech Stack & Risks

---

## 1. Vision & Architecture

### The shift

**v1** (current): Counts events independently. "48 registrations, 22 exclusives" — no way to know if the same properties passed both stages.

**v2**: Three intelligence layers:

1. **Property Journey Layer** — Every property tracked through Activation→Exclusive→Showing→Offer→Closing via `property_id`. Real conversion rates, real stage durations.
2. **Agent Intelligence Layer** — Weighted Performance Score (WPS), Portfolio Quality Score (PQS), conversion rates per agent vs team/office/company averages.
3. **Business Intelligence Layer** — Pricing intelligence with cross-filtering, stuck property alerts, effort analysis, seasonality patterns, pipeline valuation.

### Data sources

```
CRM (SQLite warehouse) = SOURCE OF TRUTH
  → properties, status_changes, price_changes, closings, exclusives, ypodikseis

Accountability (GrowthCFO Sheets) = SELF-REPORTED BY AGENT
  → accountability_reports (weekly self-reports, directional only)
  → NEVER used in scoring, NEVER linked to specific properties
  → Always labeled "Source: Agent self-report"

Excel Archives = HISTORICAL
  → billing_transactions, targets_annual, exclusive archives
```

### Frontend architecture

- **Frontend:** React (Vite) + TypeScript + Recharts + Tailwind CSS → GitHub → Vercel
- **Backend:** Supabase (Postgres + Auth + Row-Level Security)
- **Sync:** Python script runs every Monday, pushes warehouse data → Supabase
- **State:** TanStack Query (React Query) for data fetching + caching
- **360 Modal:** React Context + navigation stack, accessible from anywhere

---

## 2. Roles & Access

| Role | JWT claim | Sees | Writes |
|------|-----------|------|--------|
| Broker | `broker` | Everything (read-only) | — |
| Performance Manager | `performance_mgr` | Everything (read-only) | — |
| Operations Manager | `ops_mgr` | Everything | KPI weights, PQS weights, report generation |

Technical: Role stored in Supabase `auth.users.raw_user_meta_data.role`. RLS policies filter based on `auth.jwt() ->> 'role'`.

Initially: All three roles see identical data. No agent-level or team-level filtering yet (that's Cycle 7+ from v1 plan).

---

## 3. Core Data Model: Property Journey

### v_property_journey — The foundation

One row per property. All milestones, all durations, all quality metrics.

```sql
CREATE VIEW v_property_journey
WITH (security_invoker = true) AS
SELECT
    p.property_id,
    p.property_code,
    p.agent_id,
    p.category,                    -- 'Πώληση' / 'Ενοικίαση'
    p.subcategory,                 -- 'Διαμέρισμα', 'Μονοκατοικία', etc.
    p.price         AS listing_price,
    p.size_sqm,
    p.area,
    p.region,
    p.floor,
    p.year_built,
    p.is_retired,
    p.first_pub_date,
    p.days_on_market,
    ag.office,
    ag.canonical_name,
    ag.start_date   AS agent_start_date,
    ag.is_team,

    -- ── Milestone dates ──
    p.registration_date                              AS dt_registration,
    exc.sign_date                                    AS dt_exclusive,
    p.first_pub_date::date                           AS dt_published,
    first_show.first_showing_date                    AS dt_first_showing,
    dep.deposit_date                                 AS dt_offer,
    cl.closing_date                                  AS dt_closing,

    -- ── Milestone flags ──
    (p.registration_date IS NOT NULL)                AS has_registration,
    (exc.sign_date IS NOT NULL)                      AS has_exclusive,
    (p.first_pub_date IS NOT NULL)                   AS has_published,
    (first_show.first_showing_date IS NOT NULL)      AS has_showing,
    (dep.deposit_date IS NOT NULL)                   AS has_offer,
    (cl.closing_date IS NOT NULL)                    AS has_closing,

    -- ── Days between stages ──
    exc.sign_date - p.registration_date              AS days_reg_to_excl,
    dep.deposit_date - exc.sign_date                 AS days_excl_to_offer,
    cl.closing_date - dep.deposit_date               AS days_offer_to_closing,
    cl.closing_date - exc.sign_date                  AS days_excl_to_closing,
    cl.closing_date - p.registration_date            AS days_total_journey,

    -- ── Showing enrichment ──
    COALESCE(show_stats.total_showings, 0)           AS total_showings,
    COALESCE(show_stats.unique_clients, 0)           AS unique_clients,

    -- ── Price quality ──
    cl.closing_price,
    CASE
      WHEN p.price > 0 AND cl.closing_price > 0
      THEN ROUND(((cl.closing_price - p.price) / p.price * 100)::numeric, 1)
    END                                              AS price_delta_pct,
    cl.gci,

    -- ── Price reductions ──
    COALESCE(pc_stats.reduction_count, 0)            AS price_reduction_count

FROM properties p
LEFT JOIN agents ag ON p.agent_id = ag.agent_id

LEFT JOIN LATERAL (
    SELECT e.sign_date FROM exclusives e
    WHERE e.property_id = p.property_id
    ORDER BY e.sign_date ASC LIMIT 1
) exc ON true

LEFT JOIN LATERAL (
    SELECT MIN(y.showing_date) AS first_showing_date,
           COUNT(*) AS total_showings,
           COUNT(DISTINCT y.client_name) AS unique_clients
    FROM ypodikseis y
    WHERE y.property_id = p.property_id
) first_show ON true
-- NOTE: first_show also provides total_showings and unique_clients

-- Rebind the showing stats alias
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS total_showings,
           COUNT(DISTINCT y.client_name) AS unique_clients
    FROM ypodikseis y
    WHERE y.property_id = p.property_id
) show_stats ON true

LEFT JOIN LATERAL (
    SELECT sc.change_date AS deposit_date FROM status_changes sc
    WHERE sc.property_id = p.property_id AND sc.event_type = 'deposit'
    ORDER BY sc.change_date ASC LIMIT 1
) dep ON true

LEFT JOIN LATERAL (
    SELECT c.closing_date, c.price AS closing_price, c.gci FROM closings c
    WHERE c.property_id = p.property_id
    ORDER BY CASE WHEN c.source = 'gsheet_closings' THEN 0 ELSE 1 END,
             c.closing_date DESC LIMIT 1
) cl ON true

LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE change_eur < 0) AS reduction_count
    FROM price_changes pc2 WHERE pc2.property_id = p.property_id
) pc_stats ON true

WHERE p.agent_id IS NOT NULL;
```

### How conversion rates are computed from this

```typescript
// All from v_property_journey, filtered by period (dt_registration within range)
const journeys = usePropertyJourneys(period);

// Registration → Exclusive ratio
const reg_count = journeys.filter(j => j.has_registration).length;
const excl_count = journeys.filter(j => j.has_registration && j.has_exclusive).length;
const reg_to_excl_ratio = reg_count / excl_count; // "4.2 registrations per 1 exclusive"

// Same pattern for all conversion pairs
// Can be grouped by: office, category (sale/rent), subcategory, agent_id
```

---

## 4. Weighted Scoring Systems

### 4.1 Weighted Performance Score (WPS)

**Purpose:** Single composite number ranking agent production performance.

**Metrics & default weights:**

| Metric | CRM Field | Default Weight |
|--------|-----------|---------------|
| Registrations (Καταγραφές) | crm_registrations | ×1.0 |
| Exclusives (Αποκλειστικές) | crm_exclusives | ×1.5 |
| Showings (Υποδείξεις) | crm_showings | ×1.0 |
| Offers (Προσφορές) | crm_offers | ×2.0 |
| Closings (Κλεισίματα) | crm_closings | ×3.0 |

**Calculation:**
```
WPS = Σ(metric_value × weight) × rookie_multiplier

rookie_multiplier = 2.0 if agent.start_date < 6 months ago, else 1.0
```

**Weights editable by:** Operations Manager only (stored in `kpi_weights` table).

**Note:** Only 5 metrics are weighted. The full 7 KPIs (including Published and Billing) remain visible but don't contribute to WPS.

### 4.2 Portfolio Quality Score (PQS)

**Purpose:** Measures how good an agent's current portfolio is — not how much they produce, but how healthy what they hold is.

**Metrics & default weights:**

| Dimension | Calculation | Default Weight |
|-----------|------------|---------------|
| Freshness Index | 100 - min(avg_days_on_market, 100) | ×2.0 |
| Exclusive Ratio | active_exclusives / total_properties × 100 | ×2.5 |
| Activity Level | min(avg_showings_per_property × 20, 100) | ×1.5 |
| Pricing Accuracy | max(100 - avg_price_reductions × 25, 0) | ×2.0 |
| Pipeline Depth | pct_with_showings × 100 | ×1.0 |
| Demand Score | pct_with_offer × 100 | ×1.5 |

**PQS normalized to 0-100 scale.**

**Weights editable by:** Operations Manager only (stored in `pqs_weights` table).

---

## 5. Labels & Design Language

### Bilingual labels

All UI labels in **English** with **Greek explanation in parentheses**:

```
Registrations (Καταγραφές)
Exclusive Mandates (Αποκλειστικές)
Showings (Υποδείξεις)
Offers (Προσφορές / Προκαταβολή)
Closings (Κλεισίματα)
Withdrawals (Αποσύρσεις)
Pipeline (Ροή Ακινήτων)
Leaderboard (Κατάταξη)
Portfolio (Χαρτοφυλάκιο)
Portfolio Quality Score — PQS (Δείκτης Ποιότητας Χαρτοφυλακίου)
Weighted Performance Score — WPS (Σταθμισμένη Βαθμολογία Απόδοσης)
Agent Profile (Προφίλ Συνεργάτη)
Pricing Intelligence (Τιμολόγηση & Αγορά)
Published Properties (Δημοσιευμένα Ακίνητα)
Active Mandates (Ενεργές Αναθέσεις)
Accountability (Αναφορές Συνεργατών)
Insights (Ανάλυση & Ευρήματα)
Reports (Αναφορές)
```

### Navigation tabs

```
Overview │ Pipeline │ KPIs │ Leaderboard │ Portfolio │ Pricing │ Accountability │ Withdrawals │ Reports*
                                           ├ Published
                                           └ Quality

* Reports visible only to ops_mgr role
```

### 4-Level comparison pattern (universal)

Every comparison table uses this structure:

| Metric | Entity (blue) | Team (purple) | Office (amber) | Company (gray) |
|--------|--------------|---------------|----------------|----------------|

- Green bg + text: Entity > Company avg
- Red bg + text: Entity < Company avg
- When entity = team → columns: Team | Office | Company (no team column)
- When entity = office → columns: Office | Company

### Accountability data treatment

- Always shows banner: *"ℹ️ Data source: Weekly agent self-reports (GrowthCFO). CRM data is the source of truth."*
- ACC sections use muted visual weight (lighter border, secondary background)
- Never used in WPS or PQS scoring
- Cannot be linked to specific properties (no property_id in ACC)

---

## 6. Pages & Features Summary

| # | Page | Type | Key Feature |
|---|------|------|-------------|
| 1 | Overview | Redesign | Conversion rates + quality + sale/rent breakdown |
| 2 | Pipeline (5 tabs) | NEW | Stage drill-down with flow viz + unique KPIs + 4-level comparison |
| 3 | KPIs (7+1 tabs) | Enhanced | Existing 7 + Weighted Score tab + sale/rent breakdown |
| 4 | Leaderboard | NEW | WPS ranking + PQS ranking + radar + stacked breakdown |
| 5 | Portfolio — Published | NEW | All online properties + new listings + quality indicators |
| 6 | Portfolio — Quality | NEW | PQS scoring + leaderboard + portfolio expand |
| 7 | Pricing Intelligence | NEW | Cross-filter market analysis (8 dimensions, like Strategic Statistics) |
| 8 | Accountability | NEW | ACC data + 3 conversion tabs + CRM vs ACC + sanity checks + gauges |
| 9 | Withdrawals | Keep | Unchanged from v1 |
| 10 | Agent Profile | NEW | Full page drill-down (superset of Agent 360) |
| 11 | Insights | NEW | Pricing intel, seasonality, pipeline €, stuck alerts, cooperation |
| 12 | Reports (ops_mgr) | NEW | Custom report builder + PDF export |
| 13 | Settings (ops_mgr) | NEW | KPI weights + PQS weights sliders |
| — | 360° Modal | NEW | Click any entity → slide-in panel with full detail + navigation |

---

## 7. Page 1: Overview

### Sections

**7.1 KPI Summary Cards (enhanced)**
- 7 metric cards (Registrations through Billing)
- Each card shows: CRM value, ACC value, Δ badge
- Below each number: "Sale: 32 | Rent: 16" breakdown
- Tooltip: top 3 subcategories

**7.2 Conversion Rates (NEW — property-based)**
4 ratio cards:
- Registrations → Exclusive: X:1
- Exclusives → Closing: X:1
- Showings → Offer: X:1
- Offers → Closing: X:1

Per office: Larissa | Katerini | Total
Per purpose: Sale | Rent

**7.3 Quality Metrics (NEW)**
- Avg days Exclusive → Offer
- Avg days Offer → Closing
- Avg price delta % (listing vs closing)
- Per office breakdown

**7.4 Top Performers (enhanced)**
Uses WPS instead of raw GCI for ranking.

**7.5 Sales Funnel (enhanced)**
Property-based: shows actual conversion % between stages.

**7.6 Trend Chart (keep from v1)**
Monthly bars + GCI line.

**7.7 Office Comparison (enhanced)**
Enriched with conversion rates per office.

---

## 8. Page 2: Pipeline (5 Stage Tabs)

### Concept

Each stage is its own tab showing:
- **Inflow**: How many properties entered this stage
- **Stock**: How many are currently here
- **Outflow**: How many passed to next stage
- **Dropout**: How many were lost
- **Drill-down**: Office → Team → Agent (expandable rows)
- **4-level comparison**: Entity vs Team vs Office vs Company

### Visual Flow (per stage)

```
      ┌──────────┐    Conversion    ┌──────────┐
  ──▶ │  Stage N │ ──── 45% ────▶  │ Stage N+1│ ──▶
      │  48 prop │                  │  22 prop │
      └──────────┘                  └──────────┘
           │
           ▼ 26 dropout (54%)
      ┌──────────────────┐
      │ Reasons breakdown │
      └──────────────────┘
```

### Tab 1: ACTIVATION (Καταγραφές)

**Header metrics:** Total registrations (Sale | Rent), → Pass to Exclusive: X (Y%), Avg listing price, Subcategory distribution

**Unique KPIs:**
| KPI | Source | Why |
|-----|--------|-----|
| New registrations/week (velocity) | registration_date trend | Pipeline inflow speed |
| Avg size (m²) | properties.size_sqm | What properties we target |
| Avg €/m² | price / size_sqm | Pricing benchmark |
| Geographic concentration | area, region | Where we operate |
| Sale vs Rent ratio | category | Mix balance |
| Days without exclusive (aging) | CURRENT_DATE - registration_date WHERE no exclusive | Stale registrations |
| Subcategory mix | subcategory distribution | Portfolio balance |

**Charts:** Sankey flow, bar per agent, donut subcategory, trend line velocity

**Breakdown table (expandable: Office → Team → Agent):**
| Entity | Registrations | → Exclusive | Conv% | Avg Price | Avg m² | €/m² | Aging (days) |

**Stuck alerts:** Properties registered >X days without exclusive (from v_stuck_alerts)

### Tab 2: EXCLUSIVE (Αποκλειστικές)

**Header metrics:** Total new exclusives (Sale | Rent), ← From Registration: X (Y%), → Pass to Showing: X (Y%), Avg days Registration → Exclusive

**Unique KPIs:**
| KPI | Source | Why |
|-----|--------|-----|
| Exclusive capture rate | has_excl / has_reg | Conversion efficiency |
| Avg days to capture | days_reg_to_excl | Relationship speed |
| Residential ratio | subcategory filter | "4 Club" readiness |
| Active exclusives NOW | v_active_exclusives | Current portfolio strength |
| Expiring within 30 days | end_date analysis | Renewal pipeline |
| Dormant exclusives | has_excl AND NOT has_showing | At-risk mandates |
| Exclusives with price reduction | price_changes count | Pricing problems |

**Charts:** Sankey flow, bar per agent + "4 Club" line, days timeline, pie residential/commercial, gauge active vs target

**Breakdown table:**
| Entity | New Excl. | ← From Reg | Capture% | → Showing | Show% | Avg Days | Dormant | Expiring |

### Tab 3: SHOWING (Υποδείξεις)

**Header metrics:** Total showings (Sale | Rent), Unique properties shown, Showings/property (avg), → Pass to Offer: X (Y%)

**Unique KPIs:**
| KPI | Source | Why |
|-----|--------|-----|
| Showings per property | ypodikseis count per property_id | Property "heat" |
| Unique clients shown | DISTINCT client_name | Buyer pool size |
| Repeat clients | clients with >1 showing | Serious buyers |
| Showing velocity | showings per week trend | Market demand |
| Days exclusive → first showing | dt_exclusive → dt_first_showing | Marketing speed |
| "Cold" properties | exclusive >30 days without showing | Marketing problem |
| Multi-agent showings | different agent on showing vs listing | Cooperation activity |

**Charts:** Sankey, histogram showings-per-property, bar per agent (stacked own/coop), scatter showings vs days-to-offer, trend

**Breakdown table:**
| Entity | Showings | Unique Props | Show/Prop | Unique Clients | → Offer | Conv% | Avg Days Excl→Show |

### Tab 4: OFFER (Προσφορές)

**Header metrics:** Total offers (Sale | Rent), ← From Showing: X (Y%), → Pass to Closing: X (Y%), Avg discount from listing price

**Unique KPIs:**
| KPI | Source | Why |
|-----|--------|-----|
| Multiple offers per property | >1 deposit event | High demand signal |
| Days showing → offer | dt_first_showing → dt_offer | Buyer decision speed |
| Days exclusive → offer | dt_exclusive → dt_offer | Pipeline speed |
| Offer fallthrough rate | has_offer AND NOT has_closing | Deal quality |
| Showings needed per offer | total showings / offers | Efficiency |

**Charts:** Sankey, bar per agent, box plot days distribution, waterfall listing→offer→close price

**Breakdown table:**
| Entity | Offers | ← Showings needed | Conv% | → Closing | Close% | Avg Days Show→Offer | Fallthrough |

### Tab 5: CLOSING (Κλεισίματα)

**Header metrics:** Total closings (Sale | Rent), Total GCI, Avg price delta %, Avg days on market

**Unique KPIs:**
| KPI | Source | Why |
|-----|--------|-----|
| GCI per closing | gci / count | Revenue efficiency |
| Price delta % | price_delta_pct | Pricing accuracy |
| Days offer → closing | dt_offer → dt_closing | Legal speed |
| Total days on market | registration → closing | Full cycle |
| Closing type split | closing_type | Sale/rent/cooperation |
| GCI per day on market | gci / days_total_journey | True efficiency |
| Cooperation closings % | different buyer agent | Network value |

**Charts:** Sankey, GCI bar per agent, waterfall listing→closing price, scatter days vs delta%, GCI histogram, monthly cumulative GCI

**Breakdown table:**
| Entity | Closings | GCI | Avg GCI/deal | Price Δ% | Avg Days | Coop% | GCI/day |

---

## 9. Page 3: KPIs (7+1 Tabs)

### Keep from v1
- 7 metrics: Registrations, Exclusives, Published, Showings, Offers, Closings, Billing
- Each MetricSection has 7 tabs: Agent Rank, Team Breakdown, Office vs Office, Peers Larissa, Peers Katerini, vs Company, Chart
- 4 Club section (exclusives residential ≥ 4)

### Enhancements
- **8th tab: Weighted Score** — WPS ranking with weight breakdown, rookie badge
- **Each metric row** shows: Sale | Rent | Total
- **4-level comparison** in ranking tabs (entity vs team vs office vs company)
- **Entity Selector** at top: switch between Agent / Team / Office view

---

## 10. Page 4: Leaderboard

### Two leaderboards on one page

**Section A: Performance Leaderboard (WPS)**
```
#1  ████████████████████████████ 142.5  Γιαννακός
#2  ██████████████████████████   128.0  Δερβένης
#3  █████████████████████        112.3  Κυριακόπουλος
#4  ████████████████             95.0   Μπουρονίκος
#5  ███████████████  🆕×2        88.2   Νέος Agent
```

- Horizontal bar chart ranking
- Stacked bar: WPS contribution breakdown per metric
- Radar chart: Top 5 agents comparing normalized metrics
- Filter: All / Larissa / Katerini / per Team
- Sort: By WPS / By individual metric / By GCI
- Click agent name → 360 Modal

**Section B: Portfolio Quality Leaderboard (PQS)**
```
#1  ████████████████████████████ 87.2  Γιαννακός
     Excl: 92% | Fresh: 85 | Active: 78 | Demand: 65
```

- Horizontal bar chart
- Radar chart: quality dimensions comparison
- **PQS vs WPS scatter chart**: Who has BOTH good performance AND good portfolio?
- Click agent → expand full portfolio

**Office summary:** Avg WPS and PQS per office, side by side.

---

## 11. Page 5: Portfolio — Published Properties

### Section 1: Period Summary Cards (8 KPIs)

| KPI | Source |
|-----|--------|
| New Listings (Νέες Δημοσιεύσεις) | first_pub_date IN period |
| Currently Online | is_retired = false AND first_pub_date IS NOT NULL |
| Avg Days Online | CURRENT_DATE - first_pub_date for active |
| Avg Time to First Showing | dt_published → dt_first_showing |
| Online with No Showings (>30d) | Published >30 days, 0 showings |
| Exclusive Ratio Online | Published + active exclusive / total |
| Avg Listed Price | AVG(price) |
| Avg €/m² Online | AVG(price/size_sqm) |

### Section 2: Published Properties Table

| Column | Source |
|--------|--------|
| Code | property_code |
| Type | subcategory |
| Purpose (Sale/Rent) | category |
| Area | area |
| Price | price |
| m² | size_sqm |
| €/m² | computed |
| Published | first_pub_date |
| Days Online | CURRENT_DATE - first_pub_date |
| Showings | count from ypodikseis |
| Exclusive | ⭐ if active exclusive |
| Agent | canonical_name |
| Status | 🟢/🟡/🔴 |

**Status logic:**
- 🟢 **Active**: Showing in last 30 days
- 🟡 **Slow**: Published >30 days, no showing in last 30 days
- 🔴 **Cold**: Published >90 days, no showing in last 60 days
- ⭐ **Exclusive badge**

**Filters:** Office | Purpose | Type | Agent | Status | Exclusive only
**Click property** → Expand: full property card with journey timeline
**Click agent name** → 360 Modal

### Section 3: New Listings in Period

Properties published during selected period, with:
- Days to Publish (registration → first_pub_date)
- Has Showing Yet? (boolean)
- Days to First Showing

---

## 12. Page 6: Portfolio — Quality (PQS)

### PQS Leaderboard
Same visual as WPS leaderboard but with 6 quality dimensions.

### Quality Radar Chart
Top 5 agents comparing: Freshness, Exclusive Ratio, Activity, Pricing Accuracy, Pipeline Depth, Demand Score.

### PQS vs WPS Scatter
Every agent as a dot. X = WPS, Y = PQS. Quadrants:
- Top-right: High performance + high quality (stars)
- Top-left: Good portfolio but low production
- Bottom-right: High production but poor portfolio management
- Bottom-left: Needs attention

### Quality Heatmap
Color-coded matrix: agents × quality dimensions.

### Click agent → Expand full portfolio
Shows all their properties with individual quality indicators.

---

## 13. Page 7: Pricing Intelligence

### Concept
Strategic Statistics Dashboard rebuilt in React. Cross-filtering across 8 dimensions.

### Two modes
- **Active Market**: Currently listed properties (is_retired = false)
- **Closed Deals**: Historical closings

### Page structure

```
Mode Toggle: [● Active Market] [○ Closed Deals]

Filter Bar: Office | Purpose | Period | Condition | [Reset]

Drilldown Chips: Category: Apartment ×  │  Area: Centre ×  │  [Clear All]

KPI Cards (7, update on every filter):
  Total Props │ Total Value │ Avg Price │ Avg €/m² Sale │ Avg €/m² Rent │ Avg Size │ Avg Days

Breakdown Grid (2×4 clickable tables):
  By Category │ By City │ By Area │ By Condition
  By Year Band │ By Size Band │ By Floor │ By Agent

Charts (4):
  €/m² Distribution (histogram) │ Price vs Size (scatter)
  €/m² by Area (bar chart)      │ Price trend (line)

Underlying Properties (expandable table with pagination):
  Tabs: [Sales (28)] [Rentals (14)]
  Code │ City │ Area │ Cat │ m² │ Price │ €/m² │ Days │ Agent
```

### Cross-filtering logic
Click any breakdown row → toggle drilldown filter. All KPIs, breakdowns, and underlying properties re-compute from the same filtered dataset. AND logic across dimensions.

### Client-side filtering
Load all properties for the period on mount (~7K rows fits in memory). All filtering happens in React state via useMemo. No API round-trips per click.

### Bands

```typescript
const SQM_BANDS = ['0-50', '51-80', '81-100', '101-150', '151-200', '201+'];
const YEAR_BANDS = ['Pre-1970', '1970s', '1980s', '1990s', '2000s', '2010s', '2020+'];
const FLOOR_BANDS = ['Basement', 'Semi-basement', 'Ground', '1st', '2nd', '3rd', '4th', '5th', '6th+', 'Penthouse'];
```

---

## 14. Page 8: Accountability

### Source banner (always visible)
*"ℹ️ Data source: Weekly agent self-reports (GrowthCFO). CRM data is the source of truth for verified metrics."*

### Entity Selector
Agent / Team / Office picker with period selector (Month + Year + optional Week).

### Section 1: Activity KPIs (9 cards)

| KPI | Fields |
|-----|--------|
| Total Outreach (Προσέγγιση) | cold_calls + follow_up + viber_sms + mail_newsletter |
| Total Meetings (Συναντήσεις) | all meetings_* fields |
| Total Leads (Επαφές) | leads_total, leads_in_person |
| Marketing Actions (Ενέργειες Μάρκετινγκ) | photography + flyers + signage + matterport + video + ads |
| Social & Content | social_media + videos |
| Cultivation (Καλλιέργεια) | cultivation_area |
| 8×8 Program | eight_by_eight |
| 33 Touches Program | thirty_three_touches |
| Absences (Απουσίες) | absences |

### Section 2: Declared Results (5 cards)
Listings (ACC), Exclusives (ACC), Showings (ACC), Offers (ACC), Closings (ACC)

### Section 3: Conversion Tables (3 tabs, 4-level comparison)

**Tab: Demand-Side**
| Conversion | Entity | Team | Office | Company |
|-----------|--------|------|--------|---------|
| Leads → Registrations | | | | |
| Buyer Appointment → Showing | | | | |
| Showing → Signed Offer | | | | |
| Signed Offer → Deposit | | | | |

**Tab: Supply-Side**
| Conversion | Entity | Team | Office | Company |
|-----------|--------|------|--------|---------|
| Registrations → Exclusive | | | | |
| Seller Meeting → Exclusive | | | | |
| Property Meeting → Exclusive | | | | |
| Exclusive → Deposit | | | | |

**Tab: Efficiency**
| Metric | Entity | Team | Office | Company |
|--------|--------|------|--------|---------|
| Leads per 100 Calls | | | | |
| Follow-up Intensity | | | | |
| Marketing Score | | | | |
| Marketing per Exclusive | | | | |
| High-Value Transaction Mix % | | | | |
| Multi-Channel Score | | | | |

### Section 4: CRM vs ACC Comparison

| Metric | CRM | ACC | Δ | Δ% | Indicator |
|--------|-----|-----|---|-----|-----------|
| Registrations | 45 | 48 | +3 | +6.7% | ≈ Accurate |

Indicators: ✓ Match (|Δ%| ≤ 5%) | ≈ Accurate (≤ 10%) | ~ Close (≤ 20%) | ⚠ Deviation (≤ 30%) | ❌ Mismatch (> 30%)

### Section 5: Per-Agent Accuracy
Color-coded deviation matrix. Green (≤10%) → Yellow (≤20%) → Orange (≤30%) → Red (>30%).
Butterfly diverging bar chart: positive = over-report, negative = under-report.

### Section 6: Sanity Checks
| Check | Rule | Pass/Fail |
|-------|------|-----------|
| Deposits ≤ Offers | deposit ≤ signed_offer | ✓/❌ |
| Showings ≤ Appointments × 2 | showing ≤ appointment × 2 | ✓/❌ |
| Closings ≤ Deposits | closing ≤ deposit | ✓/❌ |
| Contracts ≤ Closings | transactions ≤ closings | ✓/❌ |

### Section 7: Minimum Targets (GaugeMeter components)
Follow Up Calls vs 100 | Property Meeting Sale vs 8 | Exclusive Assignments vs 2 | Cold Calls vs 120

### Section 8: Percentile Position
Per agent: horizontal strip showing where they rank among all agents per metric.

### Section 9: Effort Mix
Stacked bar per agent: Cold calls | Follow-ups | Digital | Meetings | Marketing | Cultivation | Social
Radar chart: Top 5 agents effort profile comparison.

### Section 10: Benchmark Bar Chart
4-level comparison bars for key conversion rates.

---

## 15. Page 9: Withdrawals

Unchanged from v1. MetricSections for passive/active/closing categories + reason breakdown.

---

## 16. Page 10: Agent Profile

Full page, accessible from nav + also content of Agent 360 Modal.

### Sections:
- **A. Score Overview:** WPS rank + score, PQS rank + score, radar chart (5 performance + 6 quality dimensions)
- **B. Conversion Rates (personal):** 4 ratios vs office avg vs company avg (bar chart: 3 bars per ratio)
- **C. Quality Metrics:** Avg days per stage, price delta, vs company avg
- **D. Business Plan Progress:** GCI actual vs target (gauge), per-metric progress bars, pace indicator
- **E. Active Mandates:** Table: sign_date, days_active, type, price, area, showings. Alerts: expiring <30 days, dormant >30 days
- **F. Stuck Alerts:** Properties from v_stuck_alerts for this agent
- **G. Activity (ACC):** Monthly trend sparklines: outreach, meetings, marketing. Labeled "self-report"
- **H. Reporting Accuracy:** 5-metric CRM vs ACC deviation bar
- **I. Full Portfolio:** All properties (active + historical), filterable

---

## 17. Page 11: Insights

### CRM-based (reliable):

**11.1 Pricing Intelligence Summary** — Overpriced properties, properties with 3+ reductions, avg reduction magnitude, time to first reduction

**11.2 Seasonality Patterns** — Heatmap: Month × Metric intensity. Best/worst months. YoY comparison

**11.3 Pipeline Value** — Total € per stage, expected GCI (conversion rates × pipeline value), per-agent pipeline value

**11.4 Aging & At-Risk** — Stale listings (>90d no showing), expiring exclusives (<30d), 3+ reductions, dormant properties

**11.5 Cooperation Analysis** — Showings where agent ≠ listing agent, inter-office cooperation, cooperation closing rate

**11.6 Stuck Property Alerts** — From v_stuck_alerts view. Properties exceeding 150% of office × subcategory × stage average

### ACC-based (with disclaimers):

**11.7 Activity Overview** — Aggregate trends. Always labeled "Source: Agent self-report"

**11.8 Reporting Accuracy** — CRM vs ACC deviation per agent. Informational only, no scoring

---

## 18. Page 12: Reports (ops_mgr only)

Visible only to `ops_mgr` role.

### Report Builder
- Custom period selector (from/to dates)
- Agent/team/office filter (multi-select)
- Sections to include (checkboxes)
- Preview in browser
- PDF export button

---

## 19. Page 13: Settings (ops_mgr only)

- **WPS weights:** 5 sliders (one per metric), current values, preview impact on rankings
- **PQS weights:** 6 sliders (one per quality dimension)
- Save button → upsert to respective tables

---

## 20. 360° Modal System

### Concept

Click ANY entity name (agent, office, team, property) ANYWHERE → modal slides in from right showing full details. Navigate between related entities within the modal. No page change.

### Entity graph

```
Office ◄──────► Team ◄──────► Agent ◄──────► Property
  │                │              │              │
  ▼                ▼              ▼              ▼
Roster          Members       Portfolio      Timeline
KPIs            KPIs         Scores         Events
Rankings        Rankings     Conversions    Showings
Conversion      Performance  Business Plan  Price changes
Pipeline €      Pipeline     Activity       Closing
```

### Navigation

```typescript
interface ModalState {
  isOpen: boolean;
  stack: EntityRef[];     // navigation history
  currentIndex: number;
}

interface EntityRef {
  type: 'agent' | 'office' | 'team' | 'property';
  id: string | number;
  label: string;
}

// Context provider wraps entire app
// Usage: <EntityLink type="agent" id={42} label="Γιαννακός" />
// Click → modal opens with Agent 360 view
// Inside modal: click office name → Office 360, click property → Property 360
// Back button, Esc to close, keyboard shortcuts
```

### Agent 360

| Section | Content |
|---------|---------|
| Header | Name, office, team, start_date, rookie badge |
| Scores | WPS (rank, breakdown), PQS (rank, dimensions) |
| Conversion Rates | 4 ratios: agent vs office vs company |
| Quality Metrics | Days per stage, price Δ%, vs company |
| Business Plan | GCI actual vs target, per-metric progress |
| Active Mandates | Count, list, expiring alerts |
| Stuck Alerts | At-risk properties |
| Activity (ACC) | Monthly sparklines, labeled self-report |
| Reporting Accuracy | 5-metric deviation bar |
| Recent Closings | Last 5 closings |
| Related Links | Office →, Team →, All Properties →, All Closings → |

### Office 360

KPIs, conversion rates, quality, top 5 by WPS, top 5 by PQS, roster (clickable), teams (clickable), pipeline value, vs other office, YoY growth.

### Team 360

KPIs, conversion rates, members (clickable), pipeline value, vs other teams, % of office.

### Property 360

Journey timeline, stage durations (vs company avg), price history chart, all showings (buyer highlighted), closing details, pricing context (€/m² vs area avg), listing agent (clickable).

### Implementation

Width: ~480px fixed right panel. Semi-transparent overlay. Slide-in animation. TanStack Query caching makes going back instant. Parallel queries on open (skeleton → fill as data arrives).

---

## 21. Universal Patterns & Shared Components

### Shared component library

```
src/components/shared/
  ComparisonTable.tsx          — 4-level comparison (entity/team/office/company)
  ConversionTabs.tsx           — 3-tab container (Demand/Supply/Efficiency)
  EntitySelector.tsx           — Agent/Team/Office picker
  EntityLink.tsx               — Clickable name → 360 Modal
  GaugeMeter.tsx               — Semi-circle gauge (actual vs target)
  PercentileStrip.tsx          — Horizontal percentile position
  RadarComparison.tsx          — Multi-dimension radar chart
  FunnelFlow.tsx               — Sankey-style flow visualization
  StuckAlertList.tsx           — At-risk property alerts
  SanityCheckList.tsx          — Pass/fail logical checks
  ScoreBar.tsx                 — Horizontal bar with score label
  TrendSparkline.tsx           — Mini inline trend
  StatusBadge.tsx              — 🟢🟡🔴⭐ status indicator
  PropertyCard.tsx             — Expandable property detail with journey
  MiniKpiCard.tsx              — Compact KPI card (value + label + trend)
  BreakdownTable.tsx           — Clickable cross-filter table
  DrilldownChips.tsx           — Active filter chips with × remove
```

### Components reused from v1

| v1 Component | v2 Usage | Changes |
|-------------|---------|---------|
| MetricSection (7 tabs) | KPIs page | Add 8th tab, sale/rent split |
| MetricHeader | Pipeline stage headers | Adapt for flow in/out |
| AgentRankTab | Rankings everywhere | Enhance with WPS/PQS |
| TeamBreakdownTab | Pipeline breakdown | Add conversion columns |
| PeersTab | Pipeline per-office | Add flow arrows |
| OfficeVsOfficeTab | Pipeline + Overview | Enrich with conversion rates |
| FourClubSection | Exclusive tab | Keep, add to Pipeline |
| TrendChart | Overview + Insights | Reuse for multi-metric |
| WithdrawalCards | Withdrawals page | Unchanged |
| TopPerformers | Overview | Use WPS instead of GCI |
| KpiCards | Overview | Add sale/rent breakdown |
| SalesFunnel | Overview | Property-based |
| LoginForm | Auth | Add role display |

### Components ported from intranet

| Intranet Component | Report Hub Usage |
|-------------------|-----------------|
| ConversionTables | Accountability + Pipeline (4-level comparison) |
| GaugeMeter | Min targets, Business Plan progress |
| RadarChartSection | Agent Profile, Leaderboard |
| FunnelChart | Pipeline, Overview |
| SparklineChart | Leaderboard trends, table inline |
| PercentilePosition | Accountability, Agent Profile |
| AlertsCard | Stuck alerts, sanity checks |
| EntitySelectorCard | Universal entity selector |
| BenchmarkBarChart | Conversion rate bars |
| TeamComparisonTable | Pipeline team breakdown |
| OfficeComparisonTable | Pipeline office breakdown |
| TopPerformersCard | Overview, Pipeline stages |

---

## 22. Postgres Views — Complete SQL

### Existing views (keep from v1): 11

```
v_monthly_crm_metrics
v_monthly_acc_metrics
v_monthly_registrations
v_monthly_exclusives
v_monthly_published
v_monthly_showings
v_monthly_closings
v_monthly_billing
v_combined_metrics
v_withdrawal_reasons
v_property_events_timeline
```

### New views: 9

**v_property_journey** — See Section 3 above for full SQL.

**v_active_exclusives:**
```sql
CREATE VIEW v_active_exclusives
WITH (security_invoker = true) AS
SELECT
    e.id, e.agent_id, e.property_id, e.property_code,
    p.subcategory, p.category, p.price, p.area, p.region,
    e.sign_date, e.end_date,
    CURRENT_DATE - e.sign_date AS days_active
FROM exclusives e
JOIN properties p ON e.property_id = p.property_id
WHERE (e.end_date IS NULL OR e.end_date >= CURRENT_DATE)
  AND NOT EXISTS (
      SELECT 1 FROM status_changes sc
      WHERE sc.property_id = e.property_id
        AND sc.event_type = 'deactivation'
        AND sc.change_date >= e.sign_date
  )
  AND NOT EXISTS (
      SELECT 1 FROM closings c
      WHERE c.property_id = e.property_id
        AND c.closing_date >= e.sign_date
  );
```

**v_portfolio_quality:**
```sql
CREATE VIEW v_portfolio_quality
WITH (security_invoker = true) AS
WITH active_props AS (
    SELECT p.*,
           (e.property_id IS NOT NULL) AS is_exclusive_now,
           CURRENT_DATE - COALESCE(p.registration_date, p.first_seen_at::date) AS days_on_market
    FROM properties p
    LEFT JOIN LATERAL (
        SELECT e2.property_id FROM exclusives e2
        WHERE e2.property_id = p.property_id
          AND (e2.end_date IS NULL OR e2.end_date >= CURRENT_DATE)
        ORDER BY e2.sign_date DESC LIMIT 1
    ) e ON true
    WHERE p.is_retired = false AND p.agent_id IS NOT NULL
),
show_counts AS (
    SELECT property_id, COUNT(*) AS showing_count
    FROM ypodikseis GROUP BY property_id
),
price_reductions AS (
    SELECT property_id, COUNT(*) AS reduction_count
    FROM price_changes WHERE change_eur < 0 GROUP BY property_id
),
offers AS (
    SELECT DISTINCT property_id
    FROM status_changes WHERE event_type = 'deposit'
)
SELECT
    ap.agent_id, ag.canonical_name, ag.office,
    COUNT(*) AS total_properties,
    COUNT(*) FILTER (WHERE ap.is_exclusive_now) AS active_exclusives,
    ROUND(COUNT(*) FILTER (WHERE ap.is_exclusive_now)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS exclusive_ratio,
    ROUND(AVG(ap.days_on_market)::numeric, 0) AS avg_days_on_market,
    ROUND(AVG(COALESCE(sc.showing_count, 0))::numeric, 1) AS avg_showings_per_property,
    ROUND(COUNT(*) FILTER (WHERE sc.showing_count > 0)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS pct_with_showings,
    ROUND(AVG(COALESCE(pr.reduction_count, 0))::numeric, 1) AS avg_price_reductions,
    ROUND(COUNT(*) FILTER (WHERE o.property_id IS NOT NULL)::numeric / NULLIF(COUNT(*), 0) * 100, 1) AS pct_with_offer
FROM active_props ap
JOIN agents ag ON ap.agent_id = ag.agent_id
LEFT JOIN show_counts sc ON ap.property_id = sc.property_id
LEFT JOIN price_reductions pr ON ap.property_id = pr.property_id
LEFT JOIN offers o ON ap.property_id = o.property_id
WHERE ag.is_team = false
GROUP BY ap.agent_id, ag.canonical_name, ag.office;
```

**v_agent_activity:**
```sql
CREATE VIEW v_agent_activity
WITH (security_invoker = true) AS
SELECT
    date_trunc('month', report_date)::date AS period_start,
    agent_id,
    SUM(cold_calls) AS total_cold_calls,
    SUM(follow_up) AS total_follow_ups,
    SUM(viber_sms + mail_newsletter) AS total_digital_outreach,
    SUM(social_media + videos) AS total_social,
    SUM(meetings_sale + meetings_rent + meetings_buyer + meetings_seller
        + meetings_landlord + meetings_tenant) AS total_meetings,
    SUM(leads_total) AS total_leads,
    SUM(leads_in_person) AS total_leads_in_person,
    SUM(cultivation_area) AS total_cultivation,
    SUM(eight_by_eight) AS total_8x8,
    SUM(thirty_three_touches) AS total_33touches,
    SUM(photography + a4_flyers + circular + signage
        + matterport + video_property + ads) AS total_marketing_actions,
    SUM(open_house) AS total_open_houses,
    SUM(cooperations) AS total_cooperations,
    SUM(referral) AS total_referrals,
    SUM(absences) AS total_absences
FROM accountability_reports
GROUP BY 1, 2;
```

**v_pipeline_value:**
```sql
CREATE VIEW v_pipeline_value
WITH (security_invoker = true) AS
SELECT
    p.agent_id, ag.canonical_name, ag.office,
    COUNT(*) AS active_properties,
    SUM(p.price) AS total_listing_value,
    SUM(p.price) FILTER (WHERE e.property_id IS NOT NULL) AS exclusive_value,
    COUNT(*) FILTER (WHERE sc_show.property_id IS NOT NULL) AS with_showings,
    COUNT(*) FILTER (WHERE sc_dep.property_id IS NOT NULL) AS with_offers,
    SUM(p.price) FILTER (WHERE sc_dep.property_id IS NOT NULL) AS offer_pipeline_value
FROM properties p
JOIN agents ag ON p.agent_id = ag.agent_id
LEFT JOIN LATERAL (
    SELECT e2.property_id FROM exclusives e2
    WHERE e2.property_id = p.property_id
      AND (e2.end_date IS NULL OR e2.end_date >= CURRENT_DATE) LIMIT 1
) e ON true
LEFT JOIN LATERAL (
    SELECT DISTINCT y.property_id FROM ypodikseis y
    WHERE y.property_id = p.property_id LIMIT 1
) sc_show ON true
LEFT JOIN LATERAL (
    SELECT DISTINCT sc.property_id FROM status_changes sc
    WHERE sc.property_id = p.property_id AND sc.event_type = 'deposit' LIMIT 1
) sc_dep ON true
WHERE p.is_retired = false AND p.agent_id IS NOT NULL AND ag.is_team = false
GROUP BY p.agent_id, ag.canonical_name, ag.office;
```

**v_pricing_benchmark:**
```sql
CREATE VIEW v_pricing_benchmark
WITH (security_invoker = true) AS
SELECT
    p.area, p.subcategory, p.category,
    COUNT(*) AS property_count,
    ROUND(AVG(p.price / NULLIF(p.size_sqm, 0))::numeric, 0) AS avg_eur_per_sqm,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY p.price / NULLIF(p.size_sqm, 0))::numeric, 0) AS median_eur_per_sqm,
    ROUND(MIN(p.price / NULLIF(p.size_sqm, 0))::numeric, 0) AS min_eur_per_sqm,
    ROUND(MAX(p.price / NULLIF(p.size_sqm, 0))::numeric, 0) AS max_eur_per_sqm
FROM properties p
WHERE p.price > 0 AND p.size_sqm > 0 AND p.is_retired = false
GROUP BY p.area, p.subcategory, p.category
HAVING COUNT(*) >= 3;
```

**v_property_pricing:**
```sql
CREATE VIEW v_property_pricing
WITH (security_invoker = true) AS
SELECT
    p.property_id, p.property_code, p.agent_id,
    ag.canonical_name, ag.office,
    p.category, p.subcategory, p.area, p.region,
    p.price, p.size_sqm, p.bedrooms, p.floor, p.year_built,
    p.energy_class, p.is_retired, p.is_exclusive,
    p.first_pub_date, p.registration_date, p.days_on_market,
    CASE WHEN p.size_sqm > 0
         THEN ROUND((p.price / p.size_sqm)::numeric, 0)
    END AS eur_per_sqm,
    CASE
        WHEN p.year_built IS NOT NULL AND p.year_built::int >= EXTRACT(YEAR FROM CURRENT_DATE) - 3
        THEN 'New' ELSE 'Used'
    END AS condition,
    CASE
        WHEN p.year_built IS NULL THEN 'Unknown'
        WHEN p.year_built::int < 1970 THEN 'Pre-1970'
        WHEN p.year_built::int < 1980 THEN '1970s'
        WHEN p.year_built::int < 1990 THEN '1980s'
        WHEN p.year_built::int < 2000 THEN '1990s'
        WHEN p.year_built::int < 2010 THEN '2000s'
        WHEN p.year_built::int < 2020 THEN '2010s'
        ELSE '2020+'
    END AS year_band,
    CASE
        WHEN p.size_sqm IS NULL THEN 'Unknown'
        WHEN p.size_sqm <= 50 THEN '0-50'
        WHEN p.size_sqm <= 80 THEN '51-80'
        WHEN p.size_sqm <= 100 THEN '81-100'
        WHEN p.size_sqm <= 150 THEN '101-150'
        WHEN p.size_sqm <= 200 THEN '151-200'
        ELSE '201+'
    END AS sqm_band,
    COALESCE(sc.showing_count, 0) AS showing_count,
    COALESCE(pc.reduction_count, 0) AS price_reduction_count,
    CASE WHEN p.first_pub_date IS NOT NULL
         THEN CURRENT_DATE - p.first_pub_date::date
    END AS days_published,
    (ae.property_id IS NOT NULL) AS has_active_exclusive
FROM properties p
LEFT JOIN agents ag ON p.agent_id = ag.agent_id
LEFT JOIN LATERAL (
    SELECT COUNT(*) AS showing_count
    FROM ypodikseis y WHERE y.property_id = p.property_id
) sc ON true
LEFT JOIN LATERAL (
    SELECT COUNT(*) FILTER (WHERE change_eur < 0) AS reduction_count
    FROM price_changes pc2 WHERE pc2.property_id = p.property_id
) pc ON true
LEFT JOIN LATERAL (
    SELECT e.property_id FROM exclusives e
    WHERE e.property_id = p.property_id
      AND (e.end_date IS NULL OR e.end_date >= CURRENT_DATE) LIMIT 1
) ae ON true
WHERE p.agent_id IS NOT NULL;
```

**v_closing_pricing:**
```sql
CREATE VIEW v_closing_pricing
WITH (security_invoker = true) AS
SELECT
    c.id AS closing_id, c.property_id, c.property_code, c.agent_id,
    ag.canonical_name, ag.office,
    c.closing_date, c.closing_type, c.price AS closing_price, c.gci,
    p.category, p.subcategory, p.area, p.region, p.size_sqm,
    p.floor, p.year_built, p.price AS listing_price,
    CASE WHEN p.size_sqm > 0
         THEN ROUND((c.price / p.size_sqm)::numeric, 0)
    END AS eur_per_sqm,
    CASE WHEN p.price > 0 AND c.price > 0
         THEN ROUND(((c.price - p.price) / p.price * 100)::numeric, 1)
    END AS price_delta_pct,
    CASE
        WHEN p.year_built IS NOT NULL AND p.year_built::int >= EXTRACT(YEAR FROM c.closing_date) - 3
        THEN 'New' ELSE 'Used'
    END AS condition,
    CASE
        WHEN p.year_built IS NULL THEN 'Unknown'
        WHEN p.year_built::int < 1970 THEN 'Pre-1970'
        WHEN p.year_built::int < 1980 THEN '1970s'
        WHEN p.year_built::int < 1990 THEN '1980s'
        WHEN p.year_built::int < 2000 THEN '1990s'
        WHEN p.year_built::int < 2010 THEN '2000s'
        WHEN p.year_built::int < 2020 THEN '2010s'
        ELSE '2020+'
    END AS year_band,
    CASE
        WHEN p.size_sqm IS NULL THEN 'Unknown'
        WHEN p.size_sqm <= 50 THEN '0-50'
        WHEN p.size_sqm <= 80 THEN '51-80'
        WHEN p.size_sqm <= 100 THEN '81-100'
        WHEN p.size_sqm <= 150 THEN '101-150'
        WHEN p.size_sqm <= 200 THEN '151-200'
        ELSE '201+'
    END AS sqm_band,
    CASE WHEN p.registration_date IS NOT NULL
         THEN c.closing_date - p.registration_date
    END AS days_on_market
FROM closings c
LEFT JOIN properties p ON c.property_id = p.property_id
LEFT JOIN agents ag ON c.agent_id = ag.agent_id
WHERE c.property_id IS NOT NULL;
```

**v_stuck_alerts:**
```sql
CREATE VIEW v_stuck_alerts
WITH (security_invoker = true) AS
WITH stage_activity AS (
    SELECT
        pj.property_id, pj.property_code, pj.agent_id,
        pj.canonical_name, pj.office, pj.subcategory, pj.category,
        CASE
            WHEN pj.has_closing THEN 'closed'
            WHEN pj.has_offer THEN 'offer'
            WHEN pj.has_showing THEN 'showing'
            WHEN pj.dt_published IS NOT NULL THEN 'published'
            WHEN pj.has_exclusive THEN 'exclusive'
            WHEN pj.has_registration THEN 'registered'
            ELSE 'unknown'
        END AS current_stage,
        GREATEST(
            pj.dt_registration, pj.dt_exclusive, pj.dt_published,
            pj.dt_first_showing, pj.dt_offer, pj.dt_closing
        ) AS last_activity_date,
        CURRENT_DATE - GREATEST(
            pj.dt_registration, pj.dt_exclusive, pj.dt_published,
            pj.dt_first_showing, pj.dt_offer, pj.dt_closing
        ) AS days_since_activity
    FROM v_property_journey pj
    WHERE NOT pj.has_closing
),
office_stage_avgs AS (
    SELECT office, subcategory, current_stage,
           AVG(days_since_activity)::int AS avg_days,
           COUNT(*) AS sample_count
    FROM stage_activity
    WHERE current_stage NOT IN ('closed', 'unknown')
    GROUP BY office, subcategory, current_stage
    HAVING COUNT(*) >= 2
)
SELECT
    sa.property_id, sa.property_code, sa.agent_id,
    sa.canonical_name, sa.office, sa.subcategory, sa.category,
    sa.current_stage, sa.days_since_activity, sa.last_activity_date,
    osa.avg_days AS office_avg_days,
    sa.days_since_activity - osa.avg_days AS days_over_avg
FROM stage_activity sa
JOIN office_stage_avgs osa
  ON sa.office = osa.office
  AND sa.subcategory = osa.subcategory
  AND sa.current_stage = osa.current_stage
WHERE sa.days_since_activity > osa.avg_days * 1.5
  AND sa.days_since_activity > 7
ORDER BY (sa.days_since_activity - osa.avg_days) DESC;
```

**Total: 20 Postgres views** (11 existing + 9 new)

---

## 23. New Tables — Complete SQL

```sql
-- ══ kpi_weights ══
CREATE TABLE kpi_weights (
    id          SERIAL PRIMARY KEY,
    metric_key  TEXT NOT NULL UNIQUE,
    weight      NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    updated_by  UUID,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO kpi_weights (metric_key, weight) VALUES
  ('registrations', 1.0), ('exclusives', 1.5), ('showings', 1.0),
  ('offers', 2.0), ('closings', 3.0)
ON CONFLICT (metric_key) DO NOTHING;

ALTER TABLE kpi_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY kpi_weights_select ON kpi_weights FOR SELECT USING (true);
CREATE POLICY kpi_weights_update ON kpi_weights FOR UPDATE
  USING ((current_setting('request.jwt.claims', true)::json ->> 'role') = 'ops_mgr');

-- ══ pqs_weights ══
CREATE TABLE pqs_weights (
    id          SERIAL PRIMARY KEY,
    metric_key  TEXT NOT NULL UNIQUE,
    weight      NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    updated_by  UUID,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO pqs_weights (metric_key, weight) VALUES
  ('freshness', 2.0), ('exclusive_ratio', 2.5), ('activity_level', 1.5),
  ('pricing_accuracy', 2.0), ('pipeline_depth', 1.0), ('demand_score', 1.5)
ON CONFLICT (metric_key) DO NOTHING;

ALTER TABLE pqs_weights ENABLE ROW LEVEL SECURITY;
CREATE POLICY pqs_weights_select ON pqs_weights FOR SELECT USING (true);
CREATE POLICY pqs_weights_update ON pqs_weights FOR UPDATE
  USING ((current_setting('request.jwt.claims', true)::json ->> 'role') = 'ops_mgr');

-- ══ agent_targets ══
CREATE TABLE agent_targets (
    id                    SERIAL PRIMARY KEY,
    agent_id              INT NOT NULL REFERENCES agents(agent_id),
    year                  SMALLINT NOT NULL,
    gci_target            NUMERIC(12,2),
    registrations_target  INT,
    exclusives_target     INT,
    showings_target       INT,
    offers_target         INT,
    closings_target       INT,
    notes                 TEXT,
    updated_by            UUID,
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(agent_id, year)
);
ALTER TABLE agent_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY targets_select ON agent_targets FOR SELECT USING (true);
CREATE POLICY targets_write ON agent_targets FOR ALL
  USING ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('ops_mgr', 'broker'));

-- GRANTS for all new objects
GRANT SELECT ON v_property_journey, v_active_exclusives, v_portfolio_quality,
  v_agent_activity, v_pipeline_value, v_pricing_benchmark,
  v_property_pricing, v_closing_pricing, v_stuck_alerts
  TO anon, authenticated, service_role;

GRANT SELECT ON kpi_weights, pqs_weights, agent_targets TO anon, authenticated, service_role;
GRANT ALL ON kpi_weights, pqs_weights, agent_targets TO authenticated;
```

**Total: 3 new tables** (kpi_weights, pqs_weights, agent_targets)

---

## 24. React Hooks

```typescript
// ── Data hooks ──
usePropertyJourneys(period, filters?)     // v_property_journey filtered
useActiveExclusives(agentId?)             // v_active_exclusives
usePortfolioQuality()                     // v_portfolio_quality
useAgentActivity(period)                  // v_agent_activity
usePipelineValue()                        // v_pipeline_value
usePricingBenchmark()                     // v_pricing_benchmark
usePricingData(mode, period)              // v_property_pricing or v_closing_pricing
useStuckAlerts()                          // v_stuck_alerts

// ── Existing hooks (keep) ──
useMetrics(period)                        // v_combined_metrics
useAgents() / useTeams() / useTeamMembers()
useFunnel(period)                         // v_funnel_by_type (may be replaced)
useWithdrawals(period)                    // v_withdrawal_reasons
useTrend(period)
useAuth()
usePeriod()

// ── Computation hooks ──
useConversionRates(journeys, segmentKey)  // Compute ratios from journeys
useQualityMetrics(journeys, segmentKey)   // Avg days, price delta
useWeightedScores(metrics, weights)       // WPS calculation
usePortfolioScores(quality, pqsWeights)   // PQS calculation
useStageFlow(journeys, stage, segmentKey) // Flow in/out per stage
usePricingEngine(data, filters)           // Cross-filter computations

// ── Config hooks ──
useKpiWeights()                           // Read/write kpi_weights
usePqsWeights()                           // Read/write pqs_weights
useAgentTargets(year)                     // Read agent_targets

// ── Modal hook ──
useModal360()                             // Open/close/navigate 360 modal
```

---

## 25. Development Cycles

| Cycle | Focus | Duration | Deliverable |
|-------|-------|----------|-------------|
| **A** | Data foundation: all migrations, new views, new tables, core hooks | 1-2 wk | Data layer tested |
| **B** | 360 Modal system: shell + Agent 360 + Property 360 | 1-2 wk | Modal infrastructure |
| **C** | Pipeline: 5 stage tabs with flow viz, unique KPIs, charts, 4-level comparison | 2-3 wk | Pipeline section |
| **D** | Overview redesign: conversion cards, quality cards, sale/rent split | 1 wk | New Overview |
| **E** | Leaderboard: WPS + PQS rankings, radar, stacked bars, scatter | 1-2 wk | Leaderboard page |
| **F** | Portfolio: Published Properties + PQS + portfolio expand | 1-2 wk | Portfolio section |
| **G** | Pricing Intelligence: cross-filter dashboard, 8 breakdown tables, charts | 2 wk | Pricing page |
| **H** | Accountability: 10 sections, conversion tabs, CRM vs ACC, gauges, sanity | 1-2 wk | Accountability page |
| **I** | 360 Modal: Office 360 + Team 360 (complete the set) | 1 wk | Full 360 system |
| **J** | Agent Profile: full page, superset of Agent 360 | 1 wk | Agent page |
| **K** | Insights: pricing intel, seasonality, pipeline €, stuck alerts, cooperation | 1-2 wk | Insights page |
| **L** | Reports + Settings (ops_mgr) | 1 wk | Ops Manager tools |
| **M** | Remaining pages (CRM vs ACC, GCI) + polish + responsive + deploy | 1-2 wk | Production |

**Total: ~15-22 weeks**

**Why 360 Modal early (Cycle B)?** Every subsequent page benefits: Pipeline clicks → Agent 360, Leaderboard clicks → Agent 360, Portfolio clicks → Property 360. Building it as infrastructure means every page gets entity navigation for free.

---

## 26. Chart Library

All via Recharts (already in stack).

| Type | Usage | Component |
|------|-------|-----------|
| Horizontal bar | Leaderboard, rankings | `<BarChart layout="vertical">` |
| Stacked bar | WPS contribution, activity | `<BarChart>` + `<Bar stackId>` |
| Grouped bar | Agent vs Office vs Company | `<BarChart>` multi-Bar |
| Donut/Pie | Subcategory, sale/rent split | `<PieChart>` |
| Line/Area | Trends, velocity, cumulative | `<AreaChart>` / `<LineChart>` |
| Scatter | Days-vs-delta, PQS-vs-WPS, price-vs-size | `<ScatterChart>` |
| Radar | Agent comparison (multi-dimension) | `<RadarChart>` |
| Histogram | €/m² distribution, GCI buckets | `<BarChart>` with buckets |
| Heatmap | Seasonality, quality matrix | Custom CSS grid |
| Sankey/Flow | Stage transitions | Custom SVG |
| Gauge | Targets, active exclusives | Custom SVG (ported from intranet) |
| Sparklines | Mini trends in tables | `<LineChart>` minimal |

---

## 27. Tech Stack & Risks

### Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 6 + TypeScript |
| Styling | Tailwind CSS 4 |
| Charts | Recharts 2 |
| Data Fetching | TanStack Query 5 |
| Backend | Supabase (Postgres 15) |
| Auth | Supabase Auth (JWT claims) |
| Data Sync | Python (supabase-py), weekly Monday |
| Hosting | Vercel |
| PDF Export | html2canvas + jsPDF (or server-side) |

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| v_property_journey LATERAL JOINs on ~7K props | Medium | Indexes exist; if slow → materialized view + refresh on sync |
| Properties without registration_date (8.7%) | Low | Excluded from journey funnel (has_registration filter) |
| Exclusives without property_id (37%) | Medium | Historical Excel data, not linkable. Documented limitation |
| Negative days between stages (data errors) | Low | Frontend: display "N/A" for negatives |
| Free tier Supabase: 20 views + laterals | Low | ~15MB database, well within 500MB limit |
| ACC data accuracy | N/A | By design: CRM = truth, ACC = self-report with disclaimers |
| Client-side filtering for Pricing (7K rows) | Low | Fits in memory comfortably; tested pattern from V3 |
| 360 Modal performance (parallel queries) | Low | TanStack Query caching; skeleton loading |

---

*End of Master Plan. This document supersedes PLAN_V2.md, PLAN_V2_1.md, Addendum A, Addendum B, and Addendum C.*
