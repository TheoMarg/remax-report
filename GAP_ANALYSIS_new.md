# Gap Analysis: React Dashboard vs Legacy Projects

> Ημερομηνια: 2026-03-05
> Σκοπος: Αξιολογηση features απο παλαιοτερα projects για πιθανη ενσωματωση στο τρεχον react-dashboard

---

## Πηγες Συγκρισης

| Project | Stack | Σελιδες | Κατασταση |
|---------|-------|---------|-----------|
| **react-dashboard** (τρεχον) | React 18 + TS + Vite + Tailwind 4 + Recharts + Supabase | 7 | Production, polished UI |
| **V3 by Cursor** | Flask + SQLAlchemy + Chart.js + HTMX | 27 templates, 67 services | Mature backend, πληρης business logic |
| **Remax Ecosystem V3** | React 19 + FastAPI + SQLite | 43 pages, 80+ services, 31 chart types | Πιο feature-complete |
| **V4 Extended Experiment** | React 18 + Radix UI + Supabase + Dexie | 39 pages (demo data) | Enterprise UI patterns, χωρις πραγματικα data |
| **V4 Remax Analytics** | React 18 + Supabase RLS | Login + DB schema μονο | Καλυτερο security architecture |
| **Open Source BI** | Superset + Redash | N/A | Reference architecture μονο |

---

## Τι εχει ηδη το τρεχον dashboard

- 7 σελιδες: Overview, KPI Detail, Withdrawals, Funnel, Properties, CRM vs ACC, GCI Rankings
- Period selector (μηνας/τριμηνο/ετος)
- Supabase auth με roles (broker, admin, team_leader, agent)
- PDF export (html2canvas + jsPDF) σε ολες τις σελιδες
- 7 KPIs με CRM vs ACC breakdown, sale/rent split
- Property lifecycle timeline + showings
- GCI ranking με medals + office comparison
- Framer Motion animations, card-premium design system
- React Query caching (1h stale time)

---

# FEATURE 1: 360° Drill-Down Modals

## Τι ειναι
Click σε οποιοδηποτε agent name, property code, ή office → ανοιγει modal με ολα τα σχετικα δεδομενα σε ενα σημειο. Χωρις navigation σε αλλη σελιδα.

## Υπαρχει σε
V3 Cursor (πληρες backend), V3 Ecosystem (πληρες full-stack), V4 Experiment (UI demo)

## Τι ακριβως περιλαμβανει

### Agent 360 Modal

**Header:**
- Ονομα, ρολος, status badge (active/inactive)
- Office name (clickable → Office 360)
- Email, τηλεφωνο
- Split % και desk fee
- Company rank (#N απο X) με trend arrow

**KPI Summary (4 cards):**
- GCI MTD (progress bar προς monthly target)
- GCI YTD
- Closings MTD
- Active Listings count

**Targets card:**
- Revenue target progress bar (achieved / target)
- Exclusives achieved/target
- Closings achieved/target

**Showings card:**
- YTD count τρεχον ετος vs προηγουμενο
- YoY change %
- Weekly average

**Monthly Revenue Chart:**
- Line chart 2025 vs 2024 (12 data points)

**3 Tabs:**
1. **Κλεισιματα**: Τελευταια 5 closings (property_code, address, GCI, date) — clickable → Property 360
2. **Καταχωρησεις**: Active listings (property_code, price, DOM, showings count)
3. **Στατιστικα**: Avg Deal Value, Conversion Rate, Showings MTD, Office Rank

**Cross-links:** Office 360, Team 360, Property 360

### Property 360 Modal

**Core:**
- property_code, address, area, category, sqm, floor, year_built, condition
- lifecycle_stage: `registered → exclusive → published → under_contract → closed`
- assignment_type (exclusive/open), purpose (Πωληση/Ενοικιαση)

**Owner:**
- owner_name, owner_phone, owner_address

**Agent & Office:**
- agent_name, agent_revenue_ytd, agent_listings_count, agent_closings_count
- office_name, office_revenue_ytd

**Pricing:**
- asking_price, price_per_sqm, original_price
- price_reduction_pct = `(1 - asking_price / original_price) * 100`

**Transaction (αν εχει κλεισει):**
- deal_date, deal_price, commission_total, commission_agent, commission_office
- Commission formula αν δεν υπαρχει: SALE = `deal_price * 0.06`, RENT = `deal_price * 1.0`

**Showings:**
- total_showings, unique_customers
- Λιστα τελευταιων 10 (date, customer_name, agent_name)

**Timeline Events (με priority order):**
1. registration (priority 10) — "Καταχωρηση"
2. assignment (priority 20) — "Αναθεση σε Agent"
3. exclusive_start (priority 30) — "Εναρξη Αποκλειστικης"
4. publication_on (priority 40) — "Δημοσιευση"
5. deposit (priority 50) — "Προκαταβολη"
6. closing (priority 60) — "Οριστικοποιηση"

**Velocity KPIs (ημερες μεταξυ σταδιων):**
- DOM_registration_to_exclusive
- DOM_exclusive_to_publication
- DOM_publication_to_deposit
- DOM_deposit_to_closing
- TOTAL_DOM_registration_to_closing
- DOM_current (αν δεν εχει κλεισει: μερες απο registration εως σημερα)

**Auto-generated alerts:**
- warning: αν timeline εχει λιγοτερα απο 3 events
- error: αν status = sold αλλα δεν υπαρχει closing event
- info: αν active listing χωρις exclusive
- warning: αν λειπει owner surname

**Cross-links:** Agent 360, Office 360

## Τι χρειαζεται στο Supabase
Τα περισσοτερα data **ηδη υπαρχουν**: closings, properties, v_property_events_timeline, ypodikseis, agents, teams. Χρειαζεται:
- Ενα νεο view `v_agent_360` ή client-side aggregation
- Ισως owner data (δεν ειναι σιγουρο αν υπαρχει στο properties table)

## Εκτιμηση effort
- Agent 360: **Medium** (2-3 μερες) — modal component + data aggregation
- Property 360: **Medium** (2-3 μερες) — ηδη εχουμε timeline/showings components
- Office 360: **Small** (1 μερα) — απλοποιημενο, aggregate per office

## Αποφαση
- [ ] NAI
- [ ] OXI
- [ ] ΑΡΓΟΤΕΡΑ

---

# FEATURE 2: Targets & Achievement Tracking

## Τι ειναι
Στοχοθεσια ανα agent/office/team (ετησιοι/τριμηνιαιοι) και tracking achievement % σε ολο το dashboard.

## Υπαρχει σε
V3 Cursor (πληρης, `targets` table + audit log), V3 Ecosystem (target history page), V4 Experiment (target pages)

## Τι ακριβως περιλαμβανει

### Target Model (απο V3 Cursor)
| Field | Type | Περιγραφη |
|-------|------|-----------|
| subject_type | String | `'agent'` ή `'office'` |
| subject_id | Integer | FK σε agents/offices |
| year | Integer | Ετος στοχου |
| target_type | String | `'revenue'`, `'exclusives'`, `'closings'` |
| value | Numeric | Τιμη στοχου (€ ή count) |
| notes | String | Σημειωσεις |

### Achievement Calculation
- **Revenue**: sum of `gci` for that year vs target
- **Closings**: count of closings for that year vs target
- **Exclusives**: count of exclusive listings for that year vs target

### Achievement Status Thresholds
- `exceeded`: >= 105%
- `achieved`: 95% - 105%
- `missed`: < 95%

### UI Elements

**Progress bars σε KPI cards:**
- Πρασινο αν achievement > 100%
- Κοκκινο αν < 50%
- Πορτοκαλι αν 50-100%

**Performance vs Budget πινακας:**
- Γραμμη ανα agent: Target, Actual, Achievement %, Gap to target
- Γραμμη ανα office: Aggregate

**Run Rate projection:**
- `forecast_eoy = ytd_revenue / weeks_elapsed * 52`
- `weekly_average = ytd_revenue / weeks_elapsed`
- `gap = target - forecast_eoy`

### Target Audit Log
Καθε αλλαγη target καταγραφεται: old_value, new_value, changed_by, changed_at.

## Τι χρειαζεται στο Supabase
- **Νεο table**: `targets` (subject_type, subject_id, year, target_type, value, notes)
- **Νεο table**: `target_audit_log` (target_id, old_value, new_value, changed_by, changed_at)
- Ή εναλλακτικα: hardcoded targets σε config αρχειο (πιο απλο, αλλα δεν εχει edit UI)

## Εκτιμηση effort
- DB schema + data entry: **Small** (μερικα SQL migrations)
- Achievement UI integration σε Overview + KPI pages: **Medium** (2 μερες)
- Target management page (CRUD): **Medium** (2-3 μερες)
- Run rate / forecast projection: **Small** (1 μερα)

## Αποφαση
- [ ] NAI — πληρες (με management page)
- [ ] NAI — lite (hardcoded targets, μονο achievement bars)
- [ ] OXI
- [ ] ΑΡΓΟΤΕΡΑ

---

# FEATURE 3: Alert System

## Τι ειναι
Proactive notifications για προβληματα που χρειαζονται προσοχη: expiring exclusives, stalled deals, inactive agents, κλπ.

## Υπαρχει σε
V3 Cursor (5 property alert rules + agent alerts), V3 Ecosystem (8+ alert types + severity + churn risk)

## Τι ακριβως περιλαμβανει

### Property Alert Rules (απο V3 Cursor + V3 Ecosystem)

| Rule | Condition | Severity | Threshold |
|------|-----------|----------|-----------|
| EXCLUSIVE_EXPIRED | Αποκλειστικη εληξε χωρις ανανεωση/κλεισιμο | WARNING | > 30 ημερες μετα τη ληξη |
| STUCK_AT_EXCLUSIVE | Ακινητο σε αποκλειστικη χωρις deposit | WARNING | > 120 ημερες |
| DEPOSIT_STALLED | Deposit ανοιχτο χωρις κλεισιμο | CRITICAL | > 60 ημερες |
| NO_ACTIVITY | Κανενα event στο ακινητο | WARNING | > 45 ημερες |
| STALE_LISTING | DOM πολυ υψηλο | HIGH αν > 90, MEDIUM αν > 60 | > 60 ημερες |
| MULTIPLE_FAILED_DEPOSITS | 2+ ακυρωμενα deposits | CRITICAL | >= 2 deposits |

### Agent Alert Rules (απο V3 Ecosystem)

| Rule | Condition | Severity | Threshold |
|------|-----------|----------|-----------|
| REVENUE_DROP | Revenue πτωση MoM | HIGH αν >= 50%, MEDIUM αν >= 30% | 30% drop |
| INACTIVITY | Χωρις closing activity | MEDIUM αν < 30 μερες, HIGH αν >= 30 | 14 ημερες |
| TARGET_MISS | Πισω απο τον στοχο | HIGH αν > 50pp behind | 40pp behind expected pace |
| POSITIVE_MILESTONE | Πετυχε τον στοχο νωρις | INFO | achievement >= 100% |

### Severity Levels
- `critical` — Αμεση δραση (κοκκινο)
- `high` — Σοβαρο (πορτοκαλι)
- `medium` — Προσοχη (κιτρινο)
- `low` / `info` — Πληροφοριακο (μπλε)

### Alert Data Structure
```typescript
interface Alert {
  id: string;
  type: AlertType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  entity_type: 'agent' | 'property' | 'office';
  entity_id: number;
  entity_name: string;
  created_at: string;
  recommended_action: string;
  status: 'active' | 'acknowledged';
}
```

### Summary Object
- total, by_severity (critical, high, medium, low), by_type
- requires_action = critical + high count
- agents_affected

### Churn Risk Assessment (V3 Ecosystem)
Επιστρεφει:
- `risk_score` (0-100)
- `risk_level`: low / medium / high
- `factors[]`: {factor, impact, detail} — GPS Trend, Δραστηριοτητα, Closing Rate, Tenure
- `recommendations[]`: Προτεινομενες ενεργειες
- `similar_cases`: {stayed, left, success_rate}

### UI Elements

**Navigation badge:** Αριθμος ανεπιλυτων alerts στο nav item

**Alert page:**
- 4 summary cards (Critical, High, Medium, Info counts)
- Λιστα alerts με χρωματικη κωδικοποιηση border
- Κάθε alert: τιτλος, badge severity, περιγραφη, timestamp, action buttons

**Morning Brief (απο V3 Ecosystem):**
- Top 5/10/20 πιο κρισιμα ακινητα
- Hero card για #1 priority property (price, DOM, showings, agent, issues, suggested actions)
- Bento grid υπολοιπων

## Τι χρειαζεται στο Supabase
- Alert rules μπορουν να τρεξουν **client-side** με τα ηδη υπαρχοντα data (closings, properties, events)
- Ή: Supabase Edge Function που τρεχει periodically και γραφει σε `alerts` table
- Ή: PostgreSQL function/view που υπολογιζει on-the-fly

## Εκτιμηση effort
- Client-side alert calculation: **Medium** (2 μερες)
- Alert list page: **Small** (1 μερα)
- Nav badge integration: **Tiny** (μισή μερα)
- Morning Brief page: **Medium** (2 μερες)
- Churn risk scoring: **Large** (3+ μερες) — χρειαζεται πολλα historical data

## Αποφαση
- [ ] NAI — πληρες (alerts page + morning brief + churn)
- [ ] NAI — lite (property alerts μονο, badge + απλη λιστα)
- [ ] OXI
- [ ] ΑΡΓΟΤΕΡΑ

---

# FEATURE 4: Profitability / P&L Dashboard

## Τι ειναι
Κερδοφορια εταιρειας: GCI → RE/MAX fee → office share → agent share → costs → profit.

## Υπαρχει σε
V3 Cursor (πληρεστατο, 5 tabs), V3 Ecosystem (3 tabs)

## Τι ακριβως περιλαμβανει

### P&L Formula Chain (απο V3 Cursor)

| Βημα | Υπολογισμος |
|------|-------------|
| GCI Gross | `gci_office + gci_agent` ή εκτιμηση: SALE = `deal_price × 0.06`, RENT = `deal_price × 1.0` |
| RE/MAX Fee | `gci_gross × 0.09` (9% franchise fee) |
| GCI Net | `gci_gross - remax_fee` |
| Agent Share | `gci_net × (split_pct / 100)` — default 50/50 |
| Office Share | `gci_net - agent_share` |
| Desk Income | Sum of agents' `desk_fee` (prorated by period) |
| Costs | Απο GrowthCFO import ή εκτιμηση `office.fixed_costs / 365 × days` |
| Profit | `office_share + desk_income - costs` |
| Margin % | `profit / (office_share + desk_income) × 100` |

### 5 Tabs (V3 Cursor)

**Tab 1: Συνοψη (Summary)**
- KPI cards: GCI Gross, RE/MAX Fee, Office Commission, Agent Commission, Desk Income, Costs, Profit, Margin %
- Delta % vs προηγουμενη περιοδο
- Transaction count

**Tab 2: Μηνιαια Κερδοφορια (Monthly P&L)**
- Πινακας 12 μηνες × P&L line items
- Best month / worst month highlight
- Monthly trend chart

**Tab 3: Οικονομικα Στατιστικα (Financial Stats)**
- Sales count, rental count
- Avg deal price (sales), avg deal price (rentals)
- GCI per deal
- Transaction volume

**Tab 4: What-If Simulator**
Inputs:
- `split_percentage` (default 70)
- `desk_fee_agent` (default 1000 EUR)
- `desk_fee_team_leader` (default 500 EUR)
- `headcount_agents` (default 25)
- `headcount_team_members` (default 5)
- `expected_monthly_gci` (auto: avg τελευταιων 3 μηνων)

Outputs:
- `simulated_office_commission = expected_monthly_gci × (100 - split_pct) / 100`
- `simulated_agent_commission = expected_monthly_gci × split_pct / 100`
- `simulated_desk_income = (headcount_agents × desk_fee_agent) + (headcount_team_members × desk_fee_team_leader)`
- `simulated_remax_fee = total_gci × (0.09 / 0.91)`
- `simulated_profit = office_commission + desk_income - costs`

**Tab 5: Προβλεψη (Forecast)**
- 3-month profit projection
- Moving average (3-month window)
- Linear trend: `slope = Σ((x-x̄)(y-ȳ)) / Σ((x-x̄)²)`
- Trend direction: flat αν |slope| < 500 EUR/month

### Commission Split Models (V3 Ecosystem)

**Tiered Split (βαση achievement):**
| Achievement | Agent % |
|------------|---------|
| < 50% | 30% |
| 50-80% | 40% |
| 80-100% | 50% |
| 100-120% | 60% |
| > 120% | 70% |

**Progressive Split (σαν progressive tax):**
| GCI Bracket | Agent % |
|------------|---------|
| 0 - 100K | 40% |
| 100K - 250K | 50% |
| 250K - 500K | 60% |
| 500K+ | 70% |

**Fixed Split:** Flat ποσοστο (π.χ. 70/30)

**Scenario Simulator:** Τρεχει και τα 3 models και δειχνει ποιο ειναι καλυτερο για τον agent

## Τι χρειαζεται στο Supabase
- GCI data: **ηδη υπαρχει** (closings.gci)
- Agent split %: χρειαζεται column σε agents ή ξεχωριστο config
- Desk fees: χρειαζεται config
- Costs: χρειαζεται data source (manual input ή import)
- RE/MAX fee rate: constant (9%)

## Εκτιμηση effort
- P&L Summary (Tab 1): **Medium** (2 μερες) — υπολογισμοι + UI
- Monthly P&L (Tab 2): **Medium** (2 μερες)
- Financial Stats (Tab 3): **Small** (1 μερα)
- What-If Simulator (Tab 4): **Medium** (2 μερες) — interactive form + live calculation
- Forecast (Tab 5): **Medium** (2 μερες)
- Συνολο: **Large** (7-9 μερες)

## Αποφαση
- [ ] NAI — πληρες (5 tabs)
- [ ] NAI — lite (μονο Summary + Monthly)
- [ ] NAI — μονο What-If Simulator
- [ ] OXI
- [ ] ΑΡΓΟΤΕΡΑ

---

# FEATURE 5: Weekly Accountability / Morning Brief

## Τι ειναι
Operational dashboard: τι εγινε αυτη τη βδομαδα, ποιοι agents ειναι on track, ποιοι χρειαζονται προσοχη.

## Υπαρχει σε
V3 Ecosystem (Weekly Ops + Morning Brief pages), V3 Cursor (weekly tracking + director report)

## Τι ακριβως περιλαμβανει

### Weekly Summary
- `total_closings`: εβδομαδιαια κλεισιματα
- `total_showings`: εβδομαδιαιες ξεναγησεις
- `total_listings`: νεες καταχωρησεις
- `avg_gps`: μεσος GPS score
- `active_agents`: ενεργοι σύνεργατες
- `top_performers`: top 5 agents βδομαδας (name, closings, gps)
- `needs_attention`: agents με χαμηλο GCI (name, reason, value)

### Accountability Dashboard
Κατηγοριοποιηση agents βαση `ratio = gci / avg_gci`:
- `on_track`: ratio >= 0.8 (πρασινο)
- `needs_attention`: 0.5 <= ratio < 0.8 (πορτοκαλι)
- `critical`: ratio < 0.5 (κοκκινο)

Recommendations: Δυναμικες προτασεις βαση κατηγοριας

### Weekly Pulse
- `activity_score` (0-100)
- `momentum`: stable / growing / declining
- `wins[]`: Σημαντικα επιτευγματα εβδομαδας
- `focus_areas[]`: Τομεις εστιασης
- Alert counts

### Director Report (απο V3 Cursor)

**Strategic View:**
- 4 North-Star KPI cards: GCI YTD YoY, Closings YTD YoY, Target Achievement %, Run Rate
- Monthly GCI trend (dual line: 2025 vs 2024)
- Office comparison: GCI per office, per agent, closings, target achievement
- Revenue concentration: top 5 agents %, risk level
- Agent tiers: top_performers, on_track, at_risk, needs_attention
- Conversion funnel: new_exclusives → closings → conversion %
- Transaction metrics: avg deal size (sale/rent), avg days to close (sale/rent)

**Weekly Pulse:**
- New listings (by asset family)
- Weekly closings
- Weekly economics: weekly_gci vs required_weekly_gci, delta %, status

## Τι χρειαζεται στο Supabase
- Τα περισσοτερα data **ηδη υπαρχουν** (v_combined_metrics, closings)
- Χρειαζεται: weekly aggregation (μπορει client-side)
- GPS/Activity data: **δεν υπαρχει** — χρειαζεται ή εξωτερικη πηγη ή απλοποιηση

## Εκτιμηση effort
- Weekly Summary page: **Medium** (2-3 μερες)
- Accountability categorization: **Small** (1 μερα)
- Director Report: **Large** (3-4 μερες) — πολλα sections
- Morning Brief: **Medium** (2 μερες) — αν εχουμε ηδη alerts

## Αποφαση
- [ ] NAI — πληρες (Weekly + Director Report + Morning Brief)
- [ ] NAI — lite (μονο Weekly Summary + Accountability)
- [ ] OXI
- [ ] ΑΡΓΟΤΕΡΑ

---

# FEATURE 6: Activity Heatmap

## Τι ειναι
Calendar-style heatmap δειχνει ποτε γινονται closings (ημερα × μηνας).

## Υπαρχει σε
V3 Ecosystem (dedicated page), V3 Cursor (activity routes), V4 Experiment (page)

## Τι ακριβως περιλαμβανει

### Data Structure
- Matrix: **7 rows (Δευτερα-Κυριακη) × 12 columns (Ιαν-Δεκ)**
- Cell value = αριθμος closings εκεινη την ημερα/μηνα
- Color intensity = value / max_value

### Filtering
- Ανα ετος
- Ανα office (ή ολη η εταιρεια)
- Ανα agent (agent-specific heatmap)

### Auto-generated Insights
- Πιο δραστηρια ημερα (π.χ. "Τριτη εχει τα περισσοτερα closings")
- Πιο δραστηριος μηνας
- Weekend vs weekday ratio

### Monthly Calendar View
- Daily calendar ενος μηνα
- Count ανα ημερα
- Busiest day highlight

## Τι χρειαζεται στο Supabase
- **Ηδη υπαρχει**: closings table με closing_date
- Μονο client-side aggregation χρειαζεται

## Εκτιμηση effort
- Heatmap component: **Small** (1 μερα)
- Page + filters: **Small** (1 μερα)
- Συνολο: **2 μερες**

## Αποφαση
- [ ] NAI
- [ ] OXI
- [ ] ΑΡΓΟΤΕΡΑ

---

# FEATURE 7: Forecasting

## Τι ειναι
Predictive analytics: revenue forecast, pipeline health, seasonal analysis.

## Υπαρχει σε
V3 Cursor (pipeline-based), V3 Ecosystem (3 tabs), V4 Experiment (UI demo)

## Τι ακριβως περιλαμβανει

### Revenue Forecast (V3 Cursor — pipeline-based)
- Input: open deposits pipeline
- Historical close rate = closed / (closed + pipeline)
- Avg days to close απο historical transactions
- Per deposit: `days_remaining = avg_days_to_close - days_age`
- `expected_gci = expected_revenue × 0.06`
- Confidence: `high` (0-1 μηνας), `medium` (2-3), `low` (4-6)
- Output: monthly_forecast[], total_expected_gci, pipeline_value, avg_deal_size

### Revenue Forecast (V3 Ecosystem — average-based)
- Input: last 12 months GCI
- `avg_monthly = total_12mo_gci / 12`
- Projections: `avg_monthly ± 15%` (upper/lower bound)
- Confidence: hardcoded 75%
- YoY comparison: same period last year

### Pipeline Health Score (V3 Cursor)
Formula (0-100):
- Start at 100
- `-min(stuck_deals_pct × 0.5, 30)` (stuck = deposit > 90 days)
- `-min(avg_age_days × 0.2, 30)`
- `+min(pipeline_velocity × 2, 20)`
- `+min(conversion_rate × 0.3, 20)`
- Risk level: low >= 70, medium >= 40, high < 40

### Seasonal Factors (V3 Ecosystem)
| Μηνας | Factor |
|-------|--------|
| Ιαν | 0.85 |
| Φεβ | 0.90 |
| Μαρ | 1.05 |
| Απρ | 1.10 |
| Μαι | 1.15 |
| Ιουν | 1.20 (peak) |
| Ιουλ | 1.10 |
| Αυγ | 0.75 (χαμηλοτερο) |
| Σεπ | 1.15 |
| Οκτ | 1.10 |
| Νοε | 0.95 |
| Δεκ | 0.80 |

### UI (V4 Experiment pattern)
- 4 KPI cards: Forecast μηνα, Confidence range, Q trend, Model accuracy
- Revenue line chart: actual (solid) + forecast (dashed) + confidence band (gradient area)
- Transaction bar chart: actual vs forecast bars
- Influence factors card

## Τι χρειαζεται στο Supabase
- GCI historical data: **ηδη υπαρχει** (v_combined_metrics)
- Deposits pipeline: **μερικως** (closings table, ισως οχι open deposits)
- Seasonal factors: hardcoded constants

## Εκτιμηση effort
- Simple avg forecast + chart: **Small** (1-2 μερες)
- Pipeline-based forecast: **Medium** (2-3 μερες)
- Pipeline Health Score: **Small** (1 μερα)
- Seasonal analysis: **Small** (1 μερα)
- Full forecast page: **Medium-Large** (4-5 μερες)

## Αποφαση
- [ ] NAI — πληρες (pipeline + seasonal + health score)
- [ ] NAI — lite (simple avg forecast + chart)
- [ ] OXI
- [ ] ΑΡΓΟΤΕΡΑ

---

# FEATURE 8: Deeper Property Management

## Τι ειναι
Ξεχωριστες σελιδες/sections για exclusives, deposits, showings, rescue center.

## Υπαρχει σε
V3 Ecosystem (5 property sub-pages), V3 Cursor (lifecycle routes), V4 Experiment (4 pages)

## Τι ακριβως περιλαμβανει

### Exclusives Management
- Active exclusives list: property_code, agent, area, asking_price, exclusive_start, exclusive_end, DOM
- Expiration tracking: ποσα ληγουν σε 7/14/30 ημερες
- Renewal alerts
- Performance: exclusive → closing conversion rate

### Deposits Tracking
- Pending deposits list: property_code, deposit_date, amount, expected_closing_date, agent
- Days since deposit
- Stalled deposit alerts (> 60 ημερες)
- Expected GCI pipeline: sum of deposit properties × estimated commission

### Showings Dashboard
- Showing volume per agent per period
- Conversion: showing → offer → close rate
- Property with most showings
- Agent efficiency: closings / showings ratio

### Rescue Center (V3 Ecosystem)
Properties που χρειαζονται δραση:

**Summary cards:**
- Κρισιμα (critical count)
- Υψηλα (high count)
- Μεσαια (medium count)
- Μεσο DOM
- Stale % (ποσοστο portfolio κολλημενο)

**Value at Risk:** Συνολικη αξια ακινητων σε κινδυνο

**Filters:** Text search, Priority filter, Office filter

**Table columns:**
- Rank, Property code + type, Area + address
- Agent + office
- Τιμη + price reductions count
- DOM (κοκκινο αν > 180, πορτοκαλι αν > 90)
- Shows last 30 days
- Rescue Score (0-100, progress bar)
- Priority badge

**Rescue Score factors:**
- DOM weight
- Showings (low = bad)
- Price reductions history
- Activity recency

## Τι χρειαζεται στο Supabase
- Exclusives data: **μερικως** (properties table εχει is_exclusive, αλλα οχι exclusive dates)
- Deposits data: **ελλειπη** (χρειαζεται deposits table ή view)
- Showings data: **υπαρχει** (ypodikseis table)
- Rescue scoring: client-side calculation

## Εκτιμηση effort
- Exclusives page: **Medium** (2 μερες) — εξαρταται απο data availability
- Deposits page: **Medium** (2 μερες) — ιδιο
- Showings dashboard: **Small-Medium** (1-2 μερες) — data υπαρχει
- Rescue Center: **Medium** (2-3 μερες) — alert logic + scoring + UI
- Συνολο: **Large** (7-9 μερες)

## Αποφαση
- [ ] NAI — πληρες (ολα τα sub-pages)
- [ ] NAI — μονο Rescue Center
- [ ] NAI — μονο Showings Dashboard
- [ ] OXI
- [ ] ΑΡΓΟΤΕΡΑ

---

# FEATURE 9: Commission Calculator

## Τι ειναι
Interactive calculator για commission splits: ποσα παιρνει ο agent, ποσα το γραφειο.

## Υπαρχει σε
V3 Ecosystem (πληρης calculator + 3 split models), V3 Cursor (commission model + service)

## Τι ακριβως περιλαμβανει

### Quick Calculator
Inputs:
- `sale_price`: Τιμη πωλησης
- `commission_rate`: default 5% (6% στο V3 Cursor)
- `agent_split`: default 70%
- `is_double_end`: Boolean (και οι 2 πλευρες απο εμας)

Output:
- `total_commission = sale_price × rate × (2 αν double_end)`
- `office_share = total × (1 - agent_split)`
- `agent_share = total × agent_split`

### Commission Model (V3 Cursor)
| Field | Type |
|-------|------|
| transaction_id | FK |
| agent_id | FK |
| gross_commission | Numeric |
| broker_split_pct | Numeric (default 50%) |
| agent_split_pct | Numeric (default 50%) |
| broker_amount | Numeric |
| agent_amount | Numeric |
| office_fee | Numeric |
| marketing_fee | Numeric |
| other_deductions | Numeric |
| tax_withheld | Numeric |
| net_to_agent | Numeric |
| payment_status | pending/partial/paid/on_hold |
| amount_paid | Numeric |
| expected_payment_date | Date |

Formula: `net_to_agent = agent_amount - (office_fee + marketing_fee + other_deductions + tax_withheld)`

### Scenario Comparison (V3 Ecosystem)
Τρεχει Tiered + Progressive + Fixed split models στο ιδιο ποσο:
- Δειχνει ποιο ειναι best for agent
- Difference from best σε EUR

## Εκτιμηση effort
- Quick calculator component: **Tiny** (μιση μερα)
- Scenario comparison: **Small** (1 μερα)
- Full commission tracking page: **Medium** (2-3 μερες)

## Αποφαση
- [ ] NAI — πληρες (calculator + tracking + scenarios)
- [ ] NAI — lite (μονο quick calculator widget)
- [ ] OXI
- [ ] ΑΡΓΟΤΕΡΑ

---

# FEATURE 10: Global Search / Command Palette

## Τι ειναι
Ctrl+K ανοιγει search overlay — αναζητηση property code, agent name, address.

## Υπαρχει σε
V4 Experiment (CMDk library), V3 Cursor (global_search.js), V3 Ecosystem (global search)

## Τι ακριβως περιλαμβανει
- Keyboard shortcut: Ctrl+K (ή Cmd+K)
- Search targets: agents (by name), properties (by code, address), pages (by name)
- Results grouped by category
- Click result → navigate to page ή open 360 modal
- Recent searches history

## Εκτιμηση effort
- **Small** (1-2 μερες) — CMDk library ή custom implementation

## Αποφαση
- [ ] NAI
- [ ] OXI
- [ ] ΑΡΓΟΤΕΡΑ

---

# FEATURE 11: Sidebar Navigation

## Τι ειναι
Αντικατασταση flat top nav με collapsible sidebar (οπως ολα τα V3/V4 projects).

## Υπαρχει σε
Ολα τα legacy projects

## Τι ακριβως περιλαμβανει

### V4 Experiment Sidebar Structure
5 groups:
1. **Κυριο Μενου**: Αρχικη, Συμβουλοι, Συναλλαγες, Ομαδες, Γραφεια, Ακινητα, Στοχοι
2. **Αναλυσεις**: Προβλεψη, Κινδυνος Απωλειας, Μετατροπες
3. **360° Dashboards**: Συμβουλος, Γραφειο, Ομαδα, Επιχειρηση
4. **Δεδομενα**: Εισαγωγη, Εξαγωγη
5. **Ειδοποιησεις** (με badge count), **Αναφορες**

- Lucide icons ανα item
- Active state: `bg-sidebar-accent text-primary font-semibold`
- Mobile: hamburger toggle
- Footer: Settings link

### Ποτε χρειαζεται
- Με 7 σελιδες: η top nav δουλευει
- Με 10+ σελιδες: sidebar γινεται αναγκαιο
- Εξαρταται απο ποσα features προστιθενται

## Εκτιμηση effort
- **Small** (1-2 μερες) — replace PageNav + responsive sidebar

## Αποφαση
- [ ] NAI (αν θα μπουν 3+ νεα features/pages)
- [ ] OXI (μενει top nav)
- [ ] ΑΡΓΟΤΕΡΑ (κρινεται αφου αποφασιστουν τα features)

---

# FEATURE 12: Dark Mode

## Τι ειναι
Toggle light/dark theme.

## Υπαρχει σε
V4 Experiment (next-themes + Tailwind dark mode)

## Implementation
- Τα CSS variables στο `@theme` block ηδη υπαρχουν
- Χρειαζεται δευτερο set variables για dark mode
- Toggle switch στο Header
- `next-themes` ή custom React context

## Εκτιμηση effort
- **Small** (1-2 μερες) — CSS variables + toggle component

## Αποφαση
- [ ] NAI
- [ ] OXI
- [ ] ΑΡΓΟΤΕΡΑ

---

# FEATURE 13: Toast Notifications

## Τι ειναι
Success/error/info popups (π.χ. "PDF exported successfully").

## Υπαρχει σε
V4 Experiment + V3 Ecosystem (Sonner library)

## Implementation
```bash
npm install sonner
```
3 γραμμες κωδικα: `<Toaster />` στο App.tsx, `toast.success('...')` οπου χρειαζεται.

## Εκτιμηση effort
- **Tiny** (μιση μερα)

## Αποφαση
- [ ] NAI
- [ ] OXI

---

# FEATURE 14: Richer Chart Types

## Τι ειναι
Νεοι τυποι charts περα απο Bar/Line/Composed.

## Υπαρχει σε
V3 Ecosystem (31 chart components)

## Χρησιμοι τυποι με business value

| Chart Type | Use Case | Recharts Support |
|------------|----------|------------------|
| **Radar Chart** | Agent scoring πολλαπλων διαστασεων | `<RadarChart>` |
| **Gauge** | Target achievement % | Custom ή `<PieChart>` hack |
| **Sparklines** | Mini trends μεσα σε tables | `<LineChart>` minimal |
| **Waterfall** | Revenue buildup (GCI → costs → profit) | Custom bars |
| **Progress Ring** | Circular target indicators | SVG custom |
| **Treemap** | Revenue distribution | `<Treemap>` |
| **Heatmap** | Activity patterns | Custom grid |

## Εκτιμηση effort
- Καθε chart type: **Tiny-Small** (μιση-1 μερα)
- Εξαρταται απο ποια features τα χρειαζονται

## Αποφαση
- [ ] NAI — ολα
- [ ] NAI — μονο Radar + Sparklines
- [ ] OXI
- [ ] ΑΡΓΟΤΕΡΑ (με τα features που τα χρειαζονται)

---

# FEATURE 15: Market Report (Larissa Report)

## Τι ειναι
Professional market analysis report, εμπνευσμενο απο Knight Frank / CBRE / Colliers.

## Υπαρχει σε
V3 Cursor (Larissa Report V2 — 15 sections)

## Τι ακριβως περιλαμβανει

### 15 Sections

**Primary:**
1. **Executive Summary** — 5 hero KPIs: Κλεισιματα (QoQ), Median EUR/sqm (YoY), Avg DOM (YoY), Αξια Πωλησεων YTD, Market Pulse
2. **Price Analytics** — ανα περιοχη (top 15): median EUR/sqm, avg price, YoY change
3. **Transaction Volume & Velocity** — QoQ και YoY: counts, values, velocity
4. **Rental Market** — rental-specific pricing, demand, YoY
5. **Supply & Pipeline** — active listings, deposits, inventory health

**Secondary:**
6. **Comparative Analysis** — cross-office ή multi-period
7. **Market Outlook** — forward-looking signals

**Extended Analytics:**
8. **Methodology** — data sources
9. **Negotiation Analysis** — discount listing → closing (avg%, median%)
10. **Price Adjustments** — αριθμος/μεγεθος price changes ανα listing
11. **Agent Performance** — rankings εντος αγορας
12. **Seasonality by Office** — month heatmap ανα office
13. **Property Condition** — pricing/DOM ανα condition
14. **Floor Distribution** — pricing ανα οροφο
15. **Building Age** — pricing ανα δεκαετια κατασκευης

### Market Pulse Score
- Volume trend (30%): > 10% growth = +30, > 0% = +15, < -10% = -15
- Price trend (40%): > 5% YoY = +40, > 0% = +20, < -5% = -20
- DOM trend (30%): < -10% YoY = +30, < 0% = +15, > 20% = -15
- ΘΕΤΙΚΟ αν score >= 50, ΑΡΝΗΤΙΚΟ αν <= -20, ΟΥΔΕΤΕΡΟ αλλιως

## Τι χρειαζεται στο Supabase
- Transaction data με area, price, sqm, condition, floor, year_built: **μερικως**
- Historical data για YoY: **εξαρταται απο βαθος data**
- Rental data: **ελλειπη ισως**

## Εκτιμηση effort
- **Very Large** (5-7+ μερες) — πολλα sections, πολλα calculations
- Μπορει να γινει σε phases

## Αποφαση
- [ ] NAI — πληρες
- [ ] NAI — lite (μονο Executive Summary + Price Analytics + Volume)
- [ ] OXI
- [ ] ΑΡΓΟΤΕΡΑ

---

# FEATURE 16: Comprehensive Statistics Engine

## Τι ειναι
Unified query interface για οποιοδηποτε στατιστικο ερωτημα.

## Υπαρχει σε
V3 Cursor (`comprehensive_statistics_service.py`)

## Τι ακριβως περιλαμβανει

### Query Interface
```
metrics: ['volume', 'price', 'dom', 'revenue', 'performance']
filters: {office_id, period, team_id, agent_id, transaction_type, category, area}
group_by: ['category', 'area', 'month', 'agent', 'team', 'office', 'transaction_type']
compare_to: 'previous_year' | 'previous_month' | 'previous_quarter'
```

### 5 Metric Types

**Volume:** total_transactions, sales_count, rentals_count, exclusives_count, active_listings, sales/rentals %

**Price:** avg, median, min, max, total_value, avg_per_sqm (ξεχωριστα sales/rentals), price_negotiation (discount listing → closing)

**DOM:** avg, median, min, max, sales_avg, rentals_avg

**Revenue:** total_gci, sales_gci, rentals_gci, avg_gci_per_transaction

**Performance:** agent_count, closings_per_agent, exclusives_per_agent, conversion_rate, top_performers

### Category Normalization
12 κατηγοριες output (π.χ. ΟΡΟΦΟΔΙΑΜΕΡΙΣΜΑ → Διαμερισμα, ΔΙΠΛΟΚΑΤΟΙΚΙΑ → Μονοκατοικια)

## Εκτιμηση effort
- **Large** (4-5 μερες) — flexible query builder UI + calculations

## Αποφαση
- [ ] NAI
- [ ] OXI
- [ ] ΑΡΓΟΤΕΡΑ

---

# FEATURE 17: Real Property Lifecycle Analytics (Stage Durations + Conversions + Price Change Analytics)

## Τι ειναι
Πληρης αναλυση lifecycle ακινητων βασισμενη σε **πραγματικα events ανα property_id**: ποσος χρονος περναει αναμεσα σε καθε σταδιο, ποσα ακινητα μεταβαινουν απο το ενα σταδιο στο επομενο (real conversion rates), και πως εξελισσεται η τιμη κατα τη διαρκεια του lifecycle (price change analytics).

## Το πραγματικο Lifecycle (διορθωμενο)

```
Καταγραφη           Πρωτη καταχωρηση στο CRM
    ↓
Ενεργοποιηση        Γινεται visible σε ολους τους agents του γραφειου
    ↓
[Αποκλειστικη]      Υπογραφη αποκλειστικης εντολης (optional)
    ↓
Δημοσιευση          Δημοσιευση σε portals
    ↓
[Αλλαγες τιμης ×N]  Μειωσεις/αυξησεις τιμης κατα τη διαρκεια (parallel track)
    ↓
[Υποδειξεις ×N]     Ξεναγησεις σε πελατες (0 ή πολλες)
    ↓
[Προσφορες ×N]      Προσφορες πελατων (0 ή πολλες)
    ↓
Αποσυρση            "Εκλεισε απο εμας" → προχωραμε:
    ↓
Προκαταβολη         Deposit
    ↓
Κλεισιμο            Συμφωνια
    ↓
Συμβολαιοποιηση     Notarial deed
```

## Data Availability ανα σταδιο

| Σταδιο | Event Type | Source Table | Στο View? | Status |
|--------|-----------|-------------|-----------|--------|
| **Καταγραφη** | `registration` | `payload_json → _history_sidebar → "Καταχωρηθηκε"` | **ΟΧΙ** | **BACKFILL NEEDED** — data υπαρχει στο CRM payload για 6.353/7.307 (87%) ακινητα. Column `registration_date` υπαρχει αλλα ειναι NULL. Χρειαζεται Python backfill script. |
| **Ενεργοποιηση** | `activation` | `status_changes` | ΝΑΙ | Δουλευει — 2.098 properties εχουν activation event |
| **Αποκλειστικη** | `exclusive` | `exclusives.sign_date` | ΝΑΙ | Δουλευει — optional σταδιο |
| **Δημοσιευση** | `published` | `properties.first_pub_date` | ΝΑΙ | Δουλευει |
| **Αλλαγη τιμης** | `price_change` | `price_changes` | ΜΕΡΙΚΩΣ | View δειχνει `old_price → new_price` + `change_eur` αλλα **ΟΧΙ `change_pct`** (υπαρχει στο table) |
| **Υποδειξη** | `showing` | `ypodikseis` | ΝΑΙ | Δουλευει (0 ή πολλες ανα ακινητο) |
| **Προσφορα** | `offer` | `offers` | **ΟΧΙ** | **VIEW ΛΕΙΠΕΙ** — table υπαρχει πληρες (offer_date, offer_amount, client_name, status). Χρειαζεται 1 UNION ALL. |
| **Προκαταβολη** | `deposit` | `status_changes` | ΝΑΙ | Δουλευει |
| **Κλεισιμο** | `closing` | `closings` | ΝΑΙ | Δουλευει |
| **Συμβολαιοποιηση** | `billing` | `billing_transactions` | **ΟΧΙ** | **VIEW ΛΕΙΠΕΙ** — table υπαρχει (απο Excel billing reports). Χρειαζεται 1 UNION ALL. |

### Συνοψη κενων data
- **3 events λειπουν απο το view**: registration, offer, billing (data υπαρχει σε tables)
- **1 field λειπει**: `change_pct` στο price_change event
- **1 backfill χρειαζεται**: registration_date (Python script, 87% coverage)

## Price Change Analytics (νεο section)

### Data στο `price_changes` table (ΠΛΗΡΗ)

| Column | Type | Παραδειγμα |
|--------|------|------------|
| `property_id` | TEXT | "prop_12345" |
| `change_date` | DATE | 2025-03-15 |
| `old_price` | NUMERIC | 500.000 |
| `new_price` | NUMERIC | 480.000 |
| `change_eur` | NUMERIC | -20.000 |
| `change_pct` | NUMERIC | -4.0 |

Ολα τα fields εξαγονται αυτοματα απο το CRM (`_price_changes` array στο payload).

### Τι δειχνουμε per property (στο PropertyTimeline)

```
📉 Αλλαγη τιμης — 15/03/2025
   500.000€ → 480.000€
   −20.000€ (−4,0%)          ← κοκκινο αν μειωση, πρασινο αν αυξηση

📉 Αλλαγη τιμης — 20/05/2025
   480.000€ → 460.000€
   −20.000€ (−4,2%)

   Συνολικη μειωση: −40.000€ (−8,0%) σε 2 αλλαγες
```

### Τι δειχνουμε aggregate (στο Lifecycle Analytics)

**Price Adjustment Summary Cards:**
| Μετρικη | Τιμη |
|---------|------|
| Ακινητα με αλλαγη τιμης | 280 / 500 (56%) |
| Μεσος αριθμος αλλαγων | 2.3 ανα ακινητο |
| Μεση συνολικη μειωση | −8.5% |
| Median συνολικη μειωση | −6.2% |
| Μεγιστη μειωση | −35% |

**Correlation Analysis:**
| Ομαδα | Avg DOM | Avg Price Change | Conversion % |
|-------|---------|-----------------|--------------|
| Χωρις αλλαγη τιμης | 120 ημ. | 0% | 5.2% |
| 1 αλλαγη τιμης | 95 ημ. | −5.1% | 8.4% |
| 2+ αλλαγες τιμης | 180 ημ. | −12.3% | 11.1% |

→ Ερμηνεια: Ακινητα με αλλαγες τιμης κλεινουν πιο συχνα αλλα παιρνουν περισσοτερο χρονο.

**Price Change Impact by Subcategory:**
| Subcategory | % ακινητων με αλλαγη | Μεση μειωση | Μεση μειωση σε κλεισμενα |
|-------------|---------------------|-------------|-------------------------|
| Διαμερισμα | 52% | −6.8% | −4.2% |
| Μονοκατοικια | 68% | −11.5% | −8.1% |
| Οικοπεδο | 45% | −15.2% | −12.0% |

**Discount Analysis (listing price → closing price):**
| Μετρικη | Sale | Rent |
|---------|------|------|
| Μεση εκπτωση | −7.2% | −3.5% |
| Median εκπτωση | −5.0% | −2.0% |
| Κλεισιμο στην αρχικη τιμη | 22% | 45% |
| Κλεισιμο πανω απο αρχικη | 3% | 8% |

## Stage Pairs (ΔΙΟΡΘΩΜΕΝΑ — 10 ζευγη)

```
Καταγραφη    → Ενεργοποιηση     Ποσος χρονος μεχρι να ενεργοποιηθει
Καταγραφη    → Αποκλειστικη     Ποσος χρονος μεχρι εντολη
Ενεργοποιηση → Δημοσιευση       Ποσος χρονος μεχρι δημοσιευση
Δημοσιευση   → 1η Υποδειξη      Ποσος χρονος μεχρι πρωτη ξεναγηση
Δημοσιευση   → 1η Προσφορα      Ποσος χρονος μεχρι πρωτη προσφορα
1η Υποδειξη  → 1η Προσφορα      Ξεναγησεις μεχρι να ερθει προσφορα
1η Προσφορα  → Προκαταβολη      Διαπραγματευση μεχρι deposit
Προκαταβολη  → Κλεισιμο         Deposit μεχρι συμφωνια
Κλεισιμο     → Συμβολαιοποιηση  Συμφωνια μεχρι notarial deed
Καταγραφη    → Κλεισιμο         ΣΥΝΟΛΙΚΟΣ ΚΥΚΛΟΣ ΖΩΗΣ
```

## Gaps (5 τεχνικα κενα)

### Gap A: Query μονο closed properties
**Προβλημα**: Τωρα τραβαμε events μονο για ακινητα που εχουν κλεισει (`useClosings` φιλτραρει `closings` table πρωτα). Τα ακινητα που κολλησαν σε καποιο σταδιο ειναι αορατα → δεν μπορουμε να υπολογισουμε πραγματικα conversion rates.

**Λυση**: Νεο query/hook `usePropertyLifecycle` που τραβαει events για ΟΛΑ τα properties.

### Gap B: Real Conversion Rates (cohort-based)
**Προβλημα**: Το τρεχον Funnel page δειχνει aggregate counts ανα μηνα — αυτα ΔΕΝ ειναι τα ιδια ακινητα. Τα 30 exclusives του Ιανουαριου μπορει να αφορουν ακινητα που ενεργοποιηθηκαν τον Οκτωβριο.

**Λυση**: Count DISTINCT property_ids ανα event_type → conversion = next_stage_count / current_stage_count.

```
Καταγραφη:        600 ακινητα (100%)
Ενεργοποιηση:     500 (83%)
Αποκλειστικη:     320 (64% των ενεργοποιημενων)
Δημοσιευση:       400 (80% — μερικα δημοσιευονται χωρις αποκλειστικη)
Υποδειξη:         180 (45% των δημοσιευμενων)
Προσφορα:          60 (33% αυτων με υποδειξη)
Προκαταβολη:       45 (75% αυτων με προσφορα)
Κλεισιμο:          40 (89% αυτων με προκαταβολη)
Συμβολαιοποιηση:   38 (95% αυτων με κλεισιμο)
Overall:         38/600 = 6.3%
```

### Gap C: Distribution Analysis
**Προβλημα**: Εχουμε μονο avg/min/max. Αν τα 45 μερες avg ειναι 140 ακινητα στις 10 μερες + 10 outliers στις 300, ο Director δεν το βλεπει.

**Λυση**: Median (P50), P25, P75, histogram (buckets: 0-7, 7-14, 14-30, 30-60, 60-90, 90-180, 180+), outlier detection (> P75 + 1.5×IQR).

### Gap D: Breakdowns
**Προβλημα**: Stage durations ειναι μονο company-level. Δεν σπανε ανα agent, office, subcategory, exclusive/open.

**Λυση**: Join property events με properties table, group by dimension.

### Gap E: Pipeline Bottleneck + Price Impact Visualization
**Προβλημα**: Δεν φαινεται που κολλανε τα ακινητα, ουτε πως η τιμη επηρεαζει το κλεισιμο.

**Λυση**: Funnel chart με drop-off % + avg ημερες + price change impact per stage.

## Προτεινομενη Αρχιτεκτονικη

### Prerequisites (backend — 2-3 ωρες)

**1. Backfill `registration_date` (Python script)**
```python
# Ακολουθει pattern του backfill_transaction_type.py
# Πηγη: CRM payload → _history_sidebar → parsed_events → "Καταχωρηθηκε"
# Target: properties.registration_date
# Coverage: 6.353/7.307 (87%)
# Fallback: πρωτο activation event (66 επιπλεον)
```

**2. SQL migration — Update `v_property_events_timeline`**
3 νεα UNION ALL branches + βελτιωμενο price_change:

```sql
-- Registration (αφου γινει backfill)
UNION ALL
SELECT p.property_id, p.registration_date AS event_date, 'registration' AS event_type,
       'Καταγραφη ακινητου' AS detail, NULL::numeric AS amount
FROM properties p WHERE p.registration_date IS NOT NULL

-- Offers
UNION ALL
SELECT o.property_id, o.offer_date AS event_date, 'offer' AS event_type,
       'Προσφορα: ' || o.offer_amount::text || '€ — ' || COALESCE(o.client_name,'') AS detail,
       o.offer_amount AS amount
FROM offers o WHERE o.property_id IS NOT NULL AND o.offer_date IS NOT NULL

-- Billing / Συμβολαιοποιηση
UNION ALL
SELECT bt.property_id, bt.billing_date AS event_date, 'billing' AS event_type,
       'Συμβολαιοποιηση' AS detail, bt.amount AS amount
FROM billing_transactions bt WHERE bt.property_id IS NOT NULL

-- Price change (ΒΕΛΤΙΩΜΕΝΟ — τωρα περιλαμβανει change_pct)
-- Αντικατασταση του υπαρχοντος branch:
SELECT pc.property_id, pc.change_date AS event_date, 'price_change' AS event_type,
       pc.old_price::text || ' → ' || pc.new_price::text
         || ' (' || COALESCE(pc.change_eur::text,'?') || '€ / '
         || COALESCE(pc.change_pct::text,'?') || '%)' AS detail,
       pc.change_eur AS amount
FROM price_changes pc
```

**3. Νεο Supabase View: `v_property_stage_summary`**
```sql
CREATE VIEW v_property_stage_summary AS
SELECT
  property_id,
  MIN(event_date) FILTER (WHERE event_type = 'registration')  AS registration_date,
  MIN(event_date) FILTER (WHERE event_type = 'activation')    AS activation_date,
  MIN(event_date) FILTER (WHERE event_type = 'exclusive')     AS exclusive_date,
  MIN(event_date) FILTER (WHERE event_type = 'published')     AS published_date,
  MIN(event_date) FILTER (WHERE event_type = 'showing')       AS first_showing_date,
  MIN(event_date) FILTER (WHERE event_type = 'offer')         AS first_offer_date,
  MIN(event_date) FILTER (WHERE event_type = 'deposit')       AS deposit_date,
  MIN(event_date) FILTER (WHERE event_type = 'closing')       AS closing_date,
  MIN(event_date) FILTER (WHERE event_type = 'billing')       AS billing_date,
  COUNT(*) FILTER (WHERE event_type = 'showing')              AS showing_count,
  COUNT(*) FILTER (WHERE event_type = 'offer')                AS offer_count,
  COUNT(*) FILTER (WHERE event_type = 'price_change')         AS price_change_count
FROM v_property_events_timeline
GROUP BY property_id;
```

### Frontend — Νεο Hook + Components

**Hook: `usePropertyLifecycle(period)`**
```typescript
// 1. Fetch v_property_stage_summary (ολα τα properties)
// 2. Join με properties (agent_id, office, subcategory, is_exclusive)
// 3. Fetch price_changes raw data (old_price, new_price, change_eur, change_pct)
// Return: stage dates + conversions + distributions + price analytics
```

**Νεα UI Components:**

**1. Conversion Funnel (event-based, 9 stages)**
```
Καταγραφη        ──────────────────────────── 600 (100%)
Ενεργοποιηση     ─────────────────────────── 500 (83%)
Αποκλειστικη     ──────────────────────── 320 (64%)
Δημοσιευση       ────────────────────────── 400 (80%)
Υποδειξη         ────────────────── 180 (45%)     ← BOTTLENECK
Προσφορα         ────────── 60 (33%)
Προκαταβολη      ──────── 45 (75%)
Κλεισιμο         ─────── 40 (89%)
Συμβολαιοποιηση  ────── 38 (95%)
                                    Overall: 6.3%
```

**2. Stage Duration Table (enhanced — 10 ζευγη)**
| Σταδιο | Median | Avg | P25 | P75 | N | Conv% |
|--------|--------|-----|-----|-----|---|-------|
| Καταγρ. → Ενεργ. | 2 | 5 | 0 | 7 | 500 | 83% |
| Ενεργ. → Αποκλ. | 12 | 18 | 5 | 24 | 320 | 64% |
| Ενεργ. → Δημοσ. | 8 | 14 | 3 | 18 | 400 | 80% |
| Δημοσ. → 1η Υποδ. | 21 | 35 | 10 | 45 | 180 | 45% |
| Δημοσ. → 1η Προσφ. | 45 | 62 | 25 | 80 | 60 | 15% |
| 1η Υποδ. → 1η Προσφ. | 18 | 28 | 8 | 40 | 60 | 33% |
| 1η Προσφ. → Προκατ. | 14 | 20 | 5 | 30 | 45 | 75% |
| Προκατ. → Κλεισ. | 18 | 25 | 7 | 35 | 40 | 89% |
| Κλεισ. → Συμβολ. | 30 | 45 | 14 | 60 | 38 | 95% |
| **Καταγρ. → Κλεισ.** | **110** | **145** | **70** | **180** | **40** | **6.3%** |

**3. Price Change Impact Panel**
- Cards: % ακινητων με αλλαγη, μεσος αριθμος αλλαγων, μεση μειωση %, median μειωση %
- Correlation table: αλλαγες τιμης vs DOM vs conversion
- Subcategory breakdown: ποια κατηγορια χρειαζεται τις περισσοτερες μειωσεις
- Discount analysis: listing price → closing price (avg%, median%, % χωρις εκπτωση)

**4. Per-Property Timeline (enhanced)**
```
● 08/02/2021  Καταγραφη
● 10/02/2021  Ενεργοποιηση                      2 ημ.
● 25/02/2021  Αποκλειστικη εντολη               15 ημ.
● 01/03/2021  Δημοσιευση                         4 ημ.
↓ 15/03/2021  Αλλαγη τιμης: 500K → 480K (−20K€ / −4,0%)
↓ 20/05/2021  Αλλαγη τιμης: 480K → 460K (−20K€ / −4,2%)
● 12/04/2021  Υποδειξη: Παπαδοπουλος            42 ημ. απο δημοσ.
● 28/04/2021  Υποδειξη: Κωνσταντινου
● 15/06/2021  Προσφορα: 440K€ — Παπαδοπουλος    65 ημ. απο 1η υποδ.
● 22/06/2021  Προκαταβολη                         7 ημ.
● 10/07/2021  Κλεισιμο — 445K€                   18 ημ.
● 08/08/2021  Συμβολαιοποιηση                    29 ημ.
                    Συνολικη μειωση: −55K€ (−11%) σε 2 αλλαγες + discount
                    Συνολικος κυκλος: 152 ημερες
```

**5. Breakdown Tables** (by agent, office, subcategory, exclusive vs open)

**6. Distribution Histograms** (per stage pair)

## Εκτιμηση effort

| Component | Effort |
|-----------|--------|
| **Python backfill** `registration_date` | Small (2 ωρες) |
| **SQL migration** — 3 νεα UNION ALL + enhanced price_change + `v_property_stage_summary` | Small (1 ωρα) |
| **Re-sync** Supabase | Tiny (5 λεπτα) |
| **Frontend** `EVENT_TYPE_CONFIG` + `STAGE_PAIRS` update | Tiny (30 λεπτα) |
| **Hook** `usePropertyLifecycle` | Small (1 μερα) |
| **Conversion funnel** computation + chart | Medium (1-2 μερες) |
| **Price change analytics** panel | Medium (1-2 μερες) |
| **Distribution analysis** (median, percentiles, histogram) | Small (1 μερα) |
| **Breakdown tables** (agent, office, subcategory, exclusive) | Medium (2 μερες) |
| **Enhanced PropertyTimeline** (price changes + offers + billing inline) | Small (1 μερα) |
| **Συνολο** | **Medium-Large (7-9 μερες)** |

## Data Confidence Assessment
- **registration events**: 87% coverage μετα απο backfill (6.353/7.307). 13% θα μεινει NULL — fallback σε activation date.
- **activation events**: 2.098/7.307 (29%) — αρκετα χαμηλο, γι'αυτο η καταγραφη ειναι πιο σημαντικη ως πρωτο σταδιο
- **exclusive events**: Υψηλη αξιοπιστια (αρχειο υπογεγραμμενων εντολων)
- **published events**: Υψηλη αξιοπιστια (automated CRM field)
- **showing events**: Υψηλη αξιοπιστια (CRM καταγραφη ξεναγησεων)
- **offer events**: Υψηλη αξιοπιστια (CRM offers module, scraped)
- **price_change events**: Υψηλη αξιοπιστια (automated tracking, old_price + new_price + change_eur + change_pct)
- **deposit events**: Μετρια (keyword-based classification απο CRM description)
- **closing events**: Υψηλη αξιοπιστια (verified transactions)
- **billing events**: Υψηλη αξιοπιστια (απο Excel billing, notarized)

## Αποφαση
- [ ] NAI — πληρες (funnel + durations + price analytics + breakdowns + enhanced timeline)
- [ ] NAI — lite (μονο funnel + enhanced StageSummary + basic price info)
- [ ] NAI — χωρις backfill (ξεκινα απο Ενεργοποιηση αντι Καταγραφη)
- [ ] OXI
- [ ] ΑΡΓΟΤΕΡΑ

---


# FEATURE 18: Αξιολογηση Ποιοτητας Χαρτοφυλακιου (Portfolio Quality & Marketability)

## Τι ειναι
Βαθμολογηση εμπορευσιμοτητας ανα τυπο ακινητου (subcategory x transaction_type) βασισμενη σε **ιστορικα δεδομενα πραγματικης αποδοσης**, και αξιολογηση χαρτοφυλακιου ανα agent/office. Δεν ειναι υποκειμενικη γνωμη — ειναι data-driven scoring.

## Υπαρχει σε
V3 Cursor: `property_analytics_service.py` (DOM benchmarks per type, market health indicators), `agent_scoring_service.py` (portfolio dimension). V3 Ecosystem: παρομοια logic αλλα χωρις per-type breakdown.

**Κανενα legacy project δεν εχει composite marketability score ανα subcategory.** Αυτο ειναι νεο feature.

## Γιατι εχει αξια
- Ο Director βλεπει **ποιοι agents εχουν "βαρυ" χαρτοφυλακιο** (δυσκολα ακινητα) vs ποιοι εχουν ευκολα
- Σωστη αξιολογηση: agent με 10 βιλες δεν πρεπει να κρινεται σαν αυτον με 10 διαμερισματα
- Ερωτησεις που απαντα:
  - "Ποιος τυπος ακινητου πουλαει/νοικιαζεται πιο γρηγορα?"
  - "Ποιος τυπος χρειαζεται τις περισσοτερες μειωσεις τιμης?"
  - "Ποιοι agents εχουν concentrated portfolio σε δυσκολες κατηγοριες?"
  - "Ποια ακινητα ειναι red flags (πανω απο 2x μεσο DOM, πολλες μειωσεις)?"

## Data Availability — Τι εχουμε

### Source Tables & Metrics

| Μετρικη | Πηγη | Records | Coverage |
|---------|------|---------|----------|
| **DOM per subcategory** | `properties.days_on_market` + `status_changes` + `closings` | 7,307 props / 3,814 closings | Πληρης |
| **Absorption rate** | `closings` / active per month per subcategory | 3,814 closings | Πληρης |
| **Conversion funnel** | `v_funnel_by_type` view (ηδη υπαρχει!) | Per month per subcategory | Πληρης |
| **Showing-to-close** | `ypodikseis` (825) + `closings` (3,814) | JOIN via property_id | Μετρια (showings αραια) |
| **Price reduction pattern** | `price_changes` (8,478 records) | Per property per subcategory | Πληρης |
| **Withdrawal rate + reasons** | `status_changes` event_type='deactivation' + parsed reasons | 13,298 status changes | Πληρης |
| **List-to-close ratio** | `closings.price` / `properties.price` | Οσα εχουν closing | Πληρης |
| **Offer rate** | `offers` table + `status_changes` deposit events | Διπλη πηγη | Μετρια-Καλη |
| **Exclusive success rate** | `exclusives` + `closings` JOIN | 883 exclusives | Πληρης |

### Subcategories στο dataset (εκτιμηση μεγεθους)

| Subcategory | Transaction | Εκτιμ. ακινητων | Εκτιμ. closings | Αξιοπιστια Score |
|-------------|-------------|-----------------|-----------------|------------------|
| Διαμερισμα | Πωληση | ~2,500+ | ~1,200+ | **Υψηλη** |
| Διαμερισμα | Ενοικιαση | ~800+ | ~500+ | **Υψηλη** |
| Μονοκατοικια | Πωληση | ~600+ | ~250+ | **Υψηλη** |
| Γκαρσονιερα | Ενοικιαση | ~300+ | ~200+ | **Καλη** |
| Οικοπεδο | Πωληση | ~400+ | ~100+ | **Μετρια** |
| Μεζονετα | Πωληση | ~200+ | ~80+ | **Μετρια** |
| Καταστημα | Πωλ./Ενοικ. | ~150+ | ~60+ | **Μετρια** |
| Βιλα | Πωληση | ~50-100 | ~20-30 | **Χαμηλη** (small N) |
| Αγροτεμαχιο | Πωληση | ~100+ | ~30+ | **Χαμηλη-Μετρια** |
| Γραφειο | Ενοικιαση | ~100+ | ~40+ | **Μετρια** |

> **Σημαντικο**: Subcategories με <30 closings παιρνουν label "Ενδεικτικο — μικρο δειγμα" αντι σκληρης βαθμολογιας.

## Scoring Model

### Βημα 1: Marketability Score ανα Subcategory x Transaction Type (0-100)

Υπολογιζεται απο ιστορικα δεδομενα:

```
Marketability Score =
  0.30 x Absorption Rate Score        — Ρυθμος απορροφησης (closings/active per month)
  0.25 x DOM Score (inverse)           — Ημερες στην αγορα (χαμηλο = καλο)
  0.20 x Conversion Score              — Published -> Closing conversion rate
  0.15 x Price Stability Score (inv.)  — Ποσοστο χωρις μειωση τιμης
  0.10 x Low Withdrawal Score (inv.)   — Χαμηλο ποσοστο αποσυρσεων
```

**Normalization**: Percentile-based (rank / N x 100) μεσα στο dataset.

**DOM Benchmarks** (απο V3 Cursor):
- Πωληση: benchmark 60 ημερες, stale threshold 90 ημερες
- Ενοικιαση: benchmark 21 ημερες, stale threshold 45 ημερες

### Βημα 2: Per-Agent Portfolio Quality Score

```
Agent Portfolio Score =
  Sum(property_marketability_score x property_weight) / Sum(property_weight)

  property_weight = property.price / total_portfolio_value  (αξιακη σταθμιση)
```

**Επιπλεον metrics per agent:**

| Μετρικη | Υπολογισμος | Τι δειχνει |
|---------|-------------|------------|
| **Weighted Avg Score** | Σταθμισμενος μεσος marketability | Γενικη ποιοτητα χαρτοφυλακιου |
| **Concentration Risk** | HHI index = Sum(share^2) ανα subcategory | Ποσο diversified ειναι |
| **Red Flag Count** | Ακινητα με DOM > 2x benchmark ΚΑΙ >=2 price reductions | Προβληματικα ακινητα |
| **Stale %** | % ακινητων πανω απο stale threshold | Ποσοστο "κολλημενων" |
| **Exclusive Ratio** | % αποκλειστικων στο portfolio | Ποιοτητα εντολων |

### Βημα 3: Portfolio Mix Analysis (Office Level)

```
Υγιες χαρτοφυλακιο:
- >=60% ακινητα σε high-marketability κατηγοριες (score >= 60)
- <15% ακινητα σε red flag κατασταση
- HHI < 0.35 (οχι υπερ-συγκεντρωση σε εναν τυπο)
- >=30% αποκλειστικες εντολες
```

## UI Components

### 1. Marketability Heatmap (Κεντρικο Panel)

```
ΕΜΠΟΡΕΥΣΙΜΟΤΗΤΑ ΑΝΑ ΤΥΠΟ ΑΚΙΝΗΤΟΥ

         Πωληση                    Ενοικιαση
Γκαρσονιερα    |####| 82     Γκαρσονιερα    |#####| 91
Διαμερισμα     |####| 78     Διαμερισμα     |####| 85
Μεζονετα       |###.| 65     Καταστημα      |###.| 68
Μονοκατοικια   |###.| 58     Γραφειο        |###.| 62
Καταστημα      |##..| 45     Αποθηκη        |##..| 41
Οικοπεδο       |##..| 38
Βιλα           |#...| 28*    * μικρο δειγμα
Αγροτεμαχιο    |#...| 22*

0-40: Δυσκολη αγορα  41-60: Μετρια  61-80: Καλη  81-100: Hot
```

### 2. Breakdown Table (per subcategory)

```
Subcategory     | Listings | Closings | Conv% | Avg DOM | Avg Μειωση | Score
Διαμερισμα/Πωλ  | 2,520    | 1,210    | 48%   | 52 ημ   | -6.8%      | 78 ####
Γκαρσονιερα/Εν  | 310      | 205      | 66%   | 18 ημ   | -2.1%      | 91 #####
Μονοκατοικια/Π  | 620      | 248      | 40%   | 85 ημ   | -11.5%     | 58 ###.
Οικοπεδο/Πωλ    | 410      | 102      | 25%   | 145 ημ  | -15.2%     | 38 ##..
Βιλα/Πωλ        | 72       | 22       | 31%   | 190 ημ  | -18.0%     | 28* #...
* μικρο δειγμα (<30 closings)
```

### 3. Agent Portfolio Cards

```
ΧΑΡΤΟΦΥΛΑΚΙΟ: Παπαδοπουλος Νικος

Portfolio Score: 72/100  ########..  Καλο
Active Listings: 18      Αξια: EUR2.4M

Mix:  Διαμερ.(8) ########   Μονοκατ.(5) #####
      Οικοπ.(3)  ###        Μεζον.(2)   ##

Concentration: 0.28 (Diversified)
Exclusive: 44% (Καλο)
Red Flags: 2 ακινητα (Οικοπεδο 180ημ, Μονοκ. 3 μειωσεις)
Stale: 3/18 (17%) πανω απο threshold
```

### 4. Office Portfolio Summary

```
ΓΡΑΦΕΙΟ ΛΑΡΙΣΑ — Portfolio Health

Avg Portfolio Score: 68/100
Total Active: 145 listings  EUR18.2M αξια

Mix:
Διαμερισμα  62%  ##############################
Μονοκατοικ  18%  #########
Οικοπεδο    8%   ####
Μεζονετα    5%   ##
Αλλο        7%   ###

Agents by Portfolio Score:
Score >=70: 5 agents (65% listings)
Score 50-69: 3 agents (25% listings)
Score <50: 1 agent (10% listings)

Red Flags: 12/145 (8.3%) — κυριως Οικοπεδα + Βιλες
```

## Αξιοπιστια Assessment

| Ερωτημα | Απαντηση |
|---------|----------|
| Εχουμε αρκετα data? | **ΝΑΙ** για 5-6 κυρια subcategories. **ΜΕΤΡΙΑ** για Βιλα, Αγροτεμαχιο, Γραφειο. |
| Ειναι αντικειμενικο? | **ΝΑΙ** — 100% μετρησιμα δεδομενα (DOM, conversions, price changes), οχι γνωμες. |
| Αδυναμο σημειο? | **Showings data (825 μονο)** — χαμηλη πυκνοτητα. 0% αμεσο weight, μονο μεσω conversion. |
| Τι ΔΕΝ μετραει? | Κατασταση ακινητου (ανακαινισμενο vs χαλασμενο), ακριβη τοποθεσια, οροφο, θεα. |
| Misleading? | Μονο αν η αγορα αλλαξει ραγδαια. **Λυση**: rolling 12-month window. |

## Prerequisites

- **Feature 17 (Lifecycle Analytics)** — δινει corrected stage durations, backfilled registration_date, enhanced view
- **Supabase view `v_portfolio_marketability`** — pre-computed scores ανα subcategory x transaction_type
- **Κανενα νεο data** — ολα υπαρχουν ηδη στη βαση

## Εκτιμηση Effort

| Component | Effort |
|-----------|--------|
| **Supabase view** `v_portfolio_marketability` (SQL aggregations) | Small (3-4 ωρες) |
| **Scoring logic** (TypeScript — normalize + weight) | Small (3-4 ωρες) |
| **Hook** `usePortfolioQuality(period)` | Small (4 ωρες) |
| **Marketability Heatmap** component | Small (4 ωρες) |
| **Subcategory Breakdown Table** component | Small (3 ωρες) |
| **Agent Portfolio Cards** component | Medium (1 μερα) |
| **Office Summary** component | Small (4 ωρες) |
| **Integration** — νεα σελιδα + page nav | Small (2 ωρες) |
| **Συνολο** | **Medium (4-5 μερες)** |

> Αν υλοποιηθει μαζι με Feature 17, μοιραζονται prerequisites — ουσιαστικα +3-4 μερες πανω απο το 17.

## Αποφαση
- [ ] NAI — πληρες (heatmap + breakdown + agent cards + office summary + red flags)
- [ ] NAI — lite (μονο heatmap + breakdown table, χωρις per-agent cards)
- [ ] OXI
- [ ] ΑΡΓΟΤΕΡΑ


---

# Συνοπτικος Πινακας Αποφασεων

| # | Feature | Effort | Business Value | Data Ready? | Προτεινομενη Σειρα |
|---|---------|--------|----------------|-------------|-------------------|
| **17** | **Real Lifecycle Analytics (Durations + Conversions)** | **Medium (5-7d)** | **Πολυ Υψηλη** | **NAI** | **P0** |
| 1 | 360° Modals (Agent/Property) | Medium (4-6d) | Πολυ Υψηλη | NAI | P0 |
| 2 | Targets & Achievement | Medium (4-5d) | Πολυ Υψηλη | Χρειαζεται table | P0 |
| 3 | Alert System | Medium-Large (3-5d) | Υψηλη | NAI | P1 |
| 4 | Profitability / P&L | Large (7-9d) | Υψηλη | Μερικως | P1 |
| 5 | Weekly Accountability | Medium-Large (4-7d) | Υψηλη | NAI | P1 |
| 6 | Activity Heatmap | Small (2d) | Μετρια | NAI | P2 |
| 7 | Forecasting | Medium-Large (4-5d) | Μετρια | NAI | P2 |
| 8 | Property Management (Exclusives/Deposits/Rescue) | Large (7-9d) | Μετρια | Μερικως | P2 |
| 9 | Commission Calculator | Tiny-Small (1-2d) | Μετρια | NAI | P2 |
| 10 | Global Search | Small (1-2d) | Χαμηλη-Μετρια | NAI | P3 |
| 11 | Sidebar Navigation | Small (1-2d) | Εξαρταται | N/A | P3 |
| 12 | Dark Mode | Small (1-2d) | Χαμηλη | N/A | P3 |
| 13 | Toast Notifications | Tiny (0.5d) | Χαμηλη | N/A | P3 |
| 14 | Richer Chart Types | Small each | Χαμηλη | N/A | P3 |
| 15 | Market Report (Larissa) | Very Large (5-7d+) | Υψηλη (εξωτερικη) | Μερικως | P2 |
| 16 | Statistics Engine | Large (4-5d) | Μετρια | Μερικως | P3 |
| **18** | **Portfolio Quality & Marketability** | **Medium (4-5d)** | **Υψηλη** | **NAI** | **P1** |

---

## Σημειωσεις

### Data Availability στο Supabase
Features **1, 3, 5, 6, 7, 17, 18** μπορουν να υλοποιηθουν **κυριως με τα υπαρχοντα data** (v_combined_metrics, closings, properties, v_property_events_timeline, ypodikseis, agents, teams, exclusives, status_changes, price_changes).

Feature **2** χρειαζεται νεο `targets` table (απλο schema).

Features **4, 8, 9, 15, 16** χρειαζονται **επιπλεον data** (costs, deposits pipeline, exclusive dates, split percentages, area-level pricing).

**Feature 17 ειναι ιδανικο πρωτο βημα** γιατι εκμεταλλευεται τα πλουσιοτερα data που ηδη εχουμε (`v_property_events_timeline` — 8 event types, 6+ source tables) χωρις καμια αλλαγη στο backend.

### Αρχιτεκτονικη Επιλογη
- **Client-side computation** (τρεχον pattern): Ολα τα calculations γινονται στο React frontend. Καλο για απλοτητα, κακο για performance σε μεγαλα datasets.
- **Supabase views/functions** (V4 Analytics pattern): Calculations στη βαση. Καλυτερο performance, πιο πολυπλοκο deployment.
- **FastAPI backend** (V3 Ecosystem pattern): Dedicated Python backend. Maximum flexibility, μεγαλυτερο infrastructure overhead.

Προταση: Συνεχιζουμε client-side + Supabase views/RPCs. Δεν χρειαζεται ξεχωριστο backend.
