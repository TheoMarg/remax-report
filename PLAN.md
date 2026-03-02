# RE/MAX Delta Ktima — Monthly Broker Report Dashboard

## 1. Τι χτίζουμε

Ένα **web-based reporting dashboard** για τον Broker του RE/MAX Delta Ktima (2 γραφεία: Λάρισα, Κατερίνη). Δείχνει την απόδοση agents και teams σε πολλαπλές χρονικές περιόδους, συγκρίνοντας **πραγματικά δεδομένα CRM** με **δηλώσεις Accountability**.

**Tech stack:**
- **Frontend:** React (Vite) + TypeScript + Recharts + Tailwind CSS → GitHub → Vercel
- **Backend:** Supabase (Postgres + Auth + Row-Level Security)
- **Sync:** Python script τρέχει κάθε Δευτέρα, pushes warehouse data → Supabase

**Data strategy:** Supabase Postgres ως backend, με Postgres Views για pre-aggregation, RLS για role-based access.

---

## 2. Γιατί το χτίζουμε

Ο Broker χρειάζεται **ανά πάσα στιγμή** να απαντήσει:

1. **Πόσα κάναμε;** → KPIs: Καταγραφές, Αποκλειστικές, Υποδείξεις, Κλεισίματα, GCI
2. **Ποιος τα πάει καλά;** → Rankings ανά agent, team, γραφείο, με M.O. εταιρείας ως benchmark
3. **Λένε αλήθεια;** → CRM vs Accountability: πραγματικές καταχωρήσεις vs δηλώσεις agents
4. **Πού χάνουμε ακίνητα;** → Αποσύρσεις ανά αιτία, conversion funnel ανά τύπο ακινήτου
5. **Πώς έκλεισαν τα deals;** → Καρτέλες ακινήτων με πλήρες timeline, ημέρες ανά στάδιο
6. **Πώς πάει η χρονιά;** → Τάση ανά εβδομάδα/μήνα/τρίμηνο/έτος

Σήμερα αυτά γίνονται manually σε Excel. Ο στόχος είναι auto-generated, interactive, always-fresh, role-based report.

---

## 3. Απαιτήσεις & Περιορισμοί

### 3.1 Ανανέωση δεδομένων
- ETL scan τρέχει **κάθε Δευτέρα πρωί** (automated)
- Μετά το ETL, `sync_to_supabase.py` τρέχει αυτόματα
- Ο Broker μπαίνει **οποιαδήποτε στιγμή** και βλέπει τα τελευταία δεδομένα
- Δεν χρειάζεται manual git push / deploy

### 3.2 Χρονικές περίοδοι
- **Εβδομάδα** (τρέχουσα / προηγούμενη): Αν υπάρχουν accountability reports
- **Μήνας** (κύρια μονάδα): Πλήρης ανάλυση ανά μήνα
- **Τρίμηνο** (Q1, Q2, Q3, Q4): Aggregated αν υπάρχουν δεδομένα
- **Έτος**: Ετήσια σύνοψη, σύγκριση year-over-year

### 3.3 Role-Based Access
- **Broker**: Βλέπει τα πάντα — όλους τους agents, όλα τα γραφεία, GCI
- **Team Leader**: Βλέπει τα μέλη του team + δικά του στοιχεία
- **Agent**: Βλέπει μόνο τα δικά του στοιχεία + company averages (χωρίς ονόματα)
- **Admin**: Full access + user management

Αρχικά υλοποιούμε μόνο **Broker** role. Τα υπόλοιπα σχεδιάζονται αλλά δεν υλοποιούνται ακόμα.

---

## 4. Πηγές δεδομένων

### 4.1 Warehouse SQLite (`data/warehouse.sqlite`)

```
┌─────────────────────────┐
│ Real Status CRM         │ → properties, status_changes, price_changes,
│ (local SQLite)          │   ypodikseis (showings), closings
├─────────────────────────┤
│ GrowthCFO Google Sheets │ → accountability_reports (weekly self-reports)
│                         │   agents, teams, team_members (profiles)
├─────────────────────────┤
│ Excel Files             │ → billing_transactions (monthly notarizations)
│                         │   exclusives (mandate archives)
│                         │   targets_annual (GCI targets)
└─────────────────────────┘
         │
         ▼  ETL pipeline (κάθε Δευτέρα πρωί)
┌─────────────────────────┐
│ warehouse.sqlite        │  13 MB, ~35K rows
│ 17 tables               │  Updated weekly
└─────────────────────────┘
         │
         ▼  sync_to_supabase.py (αυτόματα μετά ETL)
┌─────────────────────────┐
│ Supabase Postgres       │  Mirrored tables + Aggregation Views
│ + Auth + RLS            │  Always fresh
└─────────────────────────┘
         │
         ▼  @supabase/supabase-js (from React)
┌─────────────────────────┐
│ React Dashboard         │  Role-based, real-time ready
│ remax-report.vercel.app │
└─────────────────────────┘
```

### 4.2 Data mapping: CRM → Accountability

| Μετρική (EL)      | CRM Source                                        | Accountability Field                      |
|--------------------|---------------------------------------------------|-------------------------------------------|
| Καταγραφές         | `status_changes` WHERE event_type='activation'    | `listings`                                |
| Αποκλειστικές      | `exclusives` table (sign_date)                    | `exclusive_mandate`                       |
| Δημοσιευμένα       | `properties.first_pub_date`                       | — (δεν υπάρχει)                           |
| Υποδείξεις         | `ypodikseis` table (showing_date)                 | `showings_sale + showings_rent`           |
| Αποσύρσεις         | `status_changes` WHERE event_type='deactivation'  | — (δεν υπάρχει)                           |
| Προσφορές          | `status_changes` WHERE event_type='deposit'       | `signed_offer`                            |
| Κλεισίματα         | `closings` table (closing_date)                   | `closing_sale + closing_rent`             |
| Συμβολαιοποιήσεις  | `billing_transactions` (billing_month)            | `transactions_*_hi + transactions_*_lo`   |

### 4.3 Agent resolution

- **102 agents** στη βάση, πολλοί auto-created duplicates
- **~47 canonical agents** (με `agent_aliases.source='canonical'`)
- **~32 active individual agents** (is_team=0, is_active=1)
- **5 team accounts** (is_team=1): Γιαννακός ΤΕΑΜ, Δερβένης ΤΕΑΜ, Γκουγκούδης TEAM, Μπουρονίκος ΤΕΑΜ, DELTA KTIMA
- **3 active teams** (config source): TEAM Γιαννακός, TEAM Δερβένης, TEAM Γκουγκούδης
- **2 offices**: Λάρισα (~35 agents), Κατερίνη (~10 agents)
- Στο Supabase sync: **μόνο canonical agents** (resolved μέσω agent_aliases)

### 4.4 Date formats στη βάση (normalized στο sync)

| Source                    | SQLite Format       | → Supabase (normalized) |
|---------------------------|---------------------|-------------------------|
| status_changes            | YYYY-MM-DD          | DATE (as-is)            |
| closings.closing_date     | DD-MM-YYYY          | DATE (reversed)         |
| exclusives.sign_date      | YYYY-MM-DD          | DATE (as-is)            |
| accountability            | ISO 8601 + ms       | TIMESTAMPTZ             |
| properties.first_pub_date | ISO 8601            | TIMESTAMPTZ             |
| billing.billing_month     | YYYY-MM             | TEXT (as-is)            |

Η normalization γίνεται στο `sync_to_supabase.py` — τα dates μπαίνουν σωστά typed στο Postgres.

---

## 5. Supabase Architecture

### 5.1 Free Tier — Χωράμε;

| Resource          | Free Tier Limit | Εμείς τώρα | Εμείς σε 5 χρόνια |
|-------------------|-----------------|-------------|---------------------|
| Database          | 500 MB          | ~15 MB      | ~65 MB              |
| File Storage      | 1 GB            | 0           | 0                   |
| Bandwidth         | 5 GB/μήνα       | ~50 MB/μήνα | ~200 MB/μήνα        |
| Auth users        | 50K MAU         | 1-5         | 10-50               |
| API requests      | Unlimited       | ~5K/μήνα    | ~20K/μήνα           |
| Active projects   | 2               | 1           | 1                   |

**Verdict: Χωράμε για πάντα.** Δεν θα χρειαστεί ποτέ Pro ($25/μήνα).

### 5.2 Supabase Tables (mirrored from SQLite)

Ίδιο schema με το SQLite, αλλά με proper Postgres types:

```sql
-- Core / Reference
agents                  -- canonical only (~47 rows)
teams                   -- config teams only (3 rows)
team_members            -- (9 rows)

-- CRM Data (synced weekly)
properties              -- (~7K rows, growing ~100/month)
status_changes          -- (~13K rows, growing ~200/month)
price_changes           -- (~8K rows, growing ~100/month)
closings                -- (~5K rows, growing ~80/month)
exclusives              -- (~900 rows, growing ~20/month)
ypodikseis              -- (~800 rows, growing ~15/month)

-- Accountability & Billing
accountability_reports  -- (~500 rows, growing ~120/month)
billing_transactions    -- (~60 rows, growing ~10/month)
targets_annual          -- (~30 rows, static per year)

-- Dashboard-specific
sync_log                -- tracks last sync timestamp
```

### 5.3 Postgres Views (server-side aggregation)

Τα heavy aggregations γίνονται ως Postgres views — η React app δεν κάνει calculations:

```sql
-- ══════════════════════════════════════════════════════
-- v_monthly_crm_metrics
-- Aggregated CRM counts per agent per month
-- Σημείωση: period_start είναι DATE (1η μέρα μήνα)
-- ══════════════════════════════════════════════════════
CREATE VIEW v_monthly_crm_metrics
WITH (security_invoker = true) AS
SELECT
    date_trunc('month', sc.change_date)::date  AS period_start,
    p.agent_id,
    COUNT(*) FILTER (WHERE sc.event_type = 'activation')   AS registrations,
    COUNT(*) FILTER (WHERE sc.event_type = 'deposit')      AS offers,
    COUNT(*) FILTER (WHERE sc.event_type = 'deactivation') AS withdrawals
FROM status_changes sc
JOIN properties p ON sc.property_id = p.property_id
WHERE p.agent_id IS NOT NULL
GROUP BY 1, 2;

-- ══════════════════════════════════════════════════════
-- v_monthly_exclusives
-- Αποκλειστικές per agent per month + residential filter
-- ══════════════════════════════════════════════════════
CREATE VIEW v_monthly_exclusives
WITH (security_invoker = true) AS
SELECT
    date_trunc('month', e.sign_date::date)::date AS period_start,
    e.agent_id,
    COUNT(*)                                      AS exclusives,
    COUNT(*) FILTER (WHERE p.subcategory IN
        ('Διαμέρισμα', 'Μονοκατοικία', 'Μεζονέτα', 'Γκαρσονιέρα',
         'Παραθεριστική Κατοικία', 'Βίλα'))       AS exclusives_residential
FROM exclusives e
LEFT JOIN properties p ON e.property_id = p.property_id
WHERE e.agent_id IS NOT NULL AND e.sign_date IS NOT NULL
GROUP BY 1, 2;

-- + similar views: v_monthly_published, v_monthly_showings,
--   v_monthly_closings, v_monthly_billing
-- (full SQL στο migration file, ίδιο pattern με date_trunc)

-- ══════════════════════════════════════════════════════
-- v_monthly_acc_metrics
-- Aggregated Accountability per agent per month
-- ══════════════════════════════════════════════════════
CREATE VIEW v_monthly_acc_metrics
WITH (security_invoker = true) AS
SELECT
    date_trunc('month', report_date::date)::date AS period_start,
    agent_id,
    SUM(listings)                                   AS acc_listings,
    SUM(exclusive_mandate)                          AS acc_exclusives,
    SUM(showings_sale + showings_rent)              AS acc_showings,
    SUM(signed_offer)                               AS acc_offers,
    SUM(closing_sale + closing_rent)                AS acc_closings,
    SUM(COALESCE(transactions_sale_hi,0) + COALESCE(transactions_sale_lo,0)
      + COALESCE(transactions_rent_hi,0) + COALESCE(transactions_rent_lo,0))
                                                    AS acc_transactions
FROM accountability_reports
GROUP BY 1, 2;

-- ══════════════════════════════════════════════════════
-- v_combined_metrics
-- CRM + ACC side by side, per agent per month
-- Περιλαμβάνει team linkage για benchmarking
-- ══════════════════════════════════════════════════════
CREATE VIEW v_combined_metrics
WITH (security_invoker = true) AS
SELECT
    COALESCE(c.period_start, a.period_start) AS period_start,
    COALESCE(c.agent_id, a.agent_id)         AS agent_id,
    ag.canonical_name,
    ag.office,
    ag.is_team,
    -- Team linkage
    tm.team_id,
    t.team_name,
    -- CRM
    COALESCE(c.registrations, 0)              AS crm_registrations,
    COALESCE(ex.exclusives, 0)                AS crm_exclusives,
    COALESCE(ex.exclusives_residential, 0)    AS crm_exclusives_residential,
    COALESCE(pub.published, 0)                AS crm_published,
    COALESCE(sh.showings, 0)                  AS crm_showings,
    COALESCE(c.withdrawals, 0)                AS crm_withdrawals,
    COALESCE(c.offers, 0)                     AS crm_offers,
    COALESCE(cl.closings, 0)                  AS crm_closings,
    COALESCE(bi.billing_count, 0)             AS crm_billing,
    COALESCE(bi.gci, 0)                       AS gci,
    -- ACC
    COALESCE(a.acc_listings, 0)               AS acc_registrations,
    COALESCE(a.acc_exclusives, 0)             AS acc_exclusives,
    COALESCE(a.acc_showings, 0)               AS acc_showings,
    COALESCE(a.acc_offers, 0)                 AS acc_offers,
    COALESCE(a.acc_closings, 0)               AS acc_closings,
    COALESCE(a.acc_transactions, 0)           AS acc_billing
FROM v_monthly_crm_metrics c
FULL OUTER JOIN v_monthly_acc_metrics a
    ON c.period_start = a.period_start AND c.agent_id = a.agent_id
LEFT JOIN agents ag
    ON COALESCE(c.agent_id, a.agent_id) = ag.agent_id
LEFT JOIN team_members tm
    ON COALESCE(c.agent_id, a.agent_id) = tm.agent_id
LEFT JOIN teams t
    ON tm.team_id = t.team_id
LEFT JOIN v_monthly_exclusives ex
    ON COALESCE(c.period_start, a.period_start) = ex.period_start
    AND COALESCE(c.agent_id, a.agent_id) = ex.agent_id
LEFT JOIN v_monthly_published pub
    ON COALESCE(c.period_start, a.period_start) = pub.period_start
    AND COALESCE(c.agent_id, a.agent_id) = pub.agent_id
LEFT JOIN v_monthly_showings sh
    ON COALESCE(c.period_start, a.period_start) = sh.period_start
    AND COALESCE(c.agent_id, a.agent_id) = sh.agent_id
LEFT JOIN v_monthly_closings cl
    ON COALESCE(c.period_start, a.period_start) = cl.period_start
    AND COALESCE(c.agent_id, a.agent_id) = cl.agent_id
LEFT JOIN v_monthly_billing bi
    ON COALESCE(c.period_start, a.period_start) = bi.period_start
    AND COALESCE(c.agent_id, a.agent_id) = bi.agent_id;

-- ══════════════════════════════════════════════════════
-- v_funnel_by_type
-- Pipeline per subcategory per month
-- ══════════════════════════════════════════════════════
CREATE VIEW v_funnel_by_type
WITH (security_invoker = true) AS
SELECT
    period_start,
    subcategory,
    SUM(registrations) AS registrations,
    SUM(exclusives)    AS exclusives,
    SUM(published)     AS published,
    SUM(showings)      AS showings,
    SUM(closings)      AS closings
FROM (
    -- subquery unions per metric per subcategory
    -- κάθε subquery χρησιμοποιεί date_trunc('month', date)::date AS period_start
    ...
) grouped
GROUP BY period_start, subcategory;

-- ══════════════════════════════════════════════════════
-- v_withdrawal_reasons
-- Parsed deactivation reasons per agent per month
-- ══════════════════════════════════════════════════════
CREATE VIEW v_withdrawal_reasons
WITH (security_invoker = true) AS
SELECT
    date_trunc('month', sc.change_date)::date AS period_start,
    p.agent_id,
    CASE
        WHEN sc.description LIKE '%Σε εκκρεμότητα%'          THEN 'Σε εκκρεμότητα'
        WHEN sc.description LIKE '%Ανενεργό%'                 THEN 'Ανενεργό'
        WHEN sc.description LIKE '%Άρση εντολής%'             THEN 'Άρση εντολής'
        WHEN sc.description LIKE '%Έκλεισε από τον πελάτη%'   THEN 'Έκλεισε από τον πελάτη'
        WHEN sc.description LIKE '%Προβληματικός πωλητής%'    THEN 'Προβληματικός πωλητής'
        WHEN sc.description LIKE '%Μεγάλη τιμή%'              THEN 'Μεγάλη τιμή'
        WHEN sc.description LIKE '%Πρόβλημα αρτιότητας%'      THEN 'Πρόβλημα αρτιότητας'
        WHEN sc.description LIKE '%Προς έλεγχο%'              THEN 'Προς έλεγχο - Χαρτιά'
        WHEN sc.description LIKE '%Συμβόλαιο σε εξέλιξη%'    THEN 'Συμβόλαιο σε εξέλιξη'
        WHEN sc.description LIKE '%Έκλεισε από άλλο μεσίτη%' THEN 'Έκλεισε από άλλο μεσίτη'
        WHEN sc.description LIKE '%€%'                        THEN 'Κλείσιμο (deposit)'
        ELSE 'Άλλο'
    END AS reason,
    COUNT(*) AS cnt
FROM status_changes sc
JOIN properties p ON sc.property_id = p.property_id
WHERE sc.event_type = 'deactivation'
GROUP BY 1, 2, 3;

-- ══════════════════════════════════════════════════════
-- v_property_events_timeline
-- Ενοποιημένο timeline ανά ακίνητο για τα Property Cards
-- UNION ALL: activation, exclusive, publish, price change,
--            deposit, closing, showing
-- ══════════════════════════════════════════════════════
CREATE VIEW v_property_events_timeline
WITH (security_invoker = true) AS
SELECT property_id, change_date AS event_date, 'activation' AS event_type,
       description AS detail, NULL::real AS amount
FROM status_changes WHERE event_type = 'activation'
UNION ALL
SELECT property_id, sign_date AS event_date, 'exclusive' AS event_type,
       'Αποκλειστική εντολή' AS detail, NULL::real AS amount
FROM exclusives WHERE property_id IS NOT NULL
UNION ALL
SELECT property_id, first_pub_date::date AS event_date, 'published' AS event_type,
       'Δημοσίευση' AS detail, NULL::real AS amount
FROM properties WHERE first_pub_date IS NOT NULL
UNION ALL
SELECT property_id, change_date AS event_date, 'price_change' AS event_type,
       old_price || ' → ' || new_price AS detail, change_eur AS amount
FROM price_changes
UNION ALL
SELECT property_id, change_date AS event_date, 'deposit' AS event_type,
       description AS detail, NULL::real AS amount
FROM status_changes WHERE event_type = 'deposit'
UNION ALL
SELECT property_id, change_date AS event_date, 'deactivation' AS event_type,
       description AS detail, NULL::real AS amount
FROM status_changes WHERE event_type = 'deactivation'
UNION ALL
SELECT c.property_id, c.closing_date::date AS event_date, 'closing' AS event_type,
       c.closing_type AS detail, c.price AS amount
FROM closings c WHERE c.property_id IS NOT NULL
UNION ALL
SELECT property_id, showing_date::date AS event_date, 'showing' AS event_type,
       client_name AS detail, NULL::real AS amount
FROM ypodikseis WHERE property_id IS NOT NULL
ORDER BY property_id, event_date;
```

### 5.4 Row-Level Security (RLS)

**Σημαντικό:** Το RLS εφαρμόζεται στα **underlying tables**, όχι στα views. Τα views δηλώνονται με `security_invoker = true` (Postgres 15+) ώστε να κληρονομούν αυτόματα τα policies των πινάκων στους οποίους κάνουν query.

```sql
-- ══════════════════════════════════════════════════════
-- Step 1: Enable RLS on all underlying tables
-- ══════════════════════════════════════════════════════
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE closings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exclusives ENABLE ROW LEVEL SECURITY;
ALTER TABLE ypodikseis ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets_annual ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════════════════
-- Step 2: Views με security_invoker = true
-- Τα views κληρονομούν τα RLS policies των underlying tables
-- ══════════════════════════════════════════════════════
CREATE VIEW v_monthly_crm_metrics WITH (security_invoker = true) AS ...;
CREATE VIEW v_monthly_acc_metrics WITH (security_invoker = true) AS ...;
CREATE VIEW v_combined_metrics WITH (security_invoker = true) AS ...;
CREATE VIEW v_funnel_by_type WITH (security_invoker = true) AS ...;
CREATE VIEW v_withdrawal_reasons WITH (security_invoker = true) AS ...;
CREATE VIEW v_property_events_timeline WITH (security_invoker = true) AS ...;

-- ══════════════════════════════════════════════════════
-- Step 3: Policies — εφαρμόζονται στα tables
-- ══════════════════════════════════════════════════════

-- Helper function: ρόλος χρήστη
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS text AS $$
  SELECT COALESCE(auth.jwt() ->> 'role', 'anon');
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION auth.user_agent_id()
RETURNS int AS $$
  SELECT (auth.jwt() ->> 'agent_id')::int;
$$ LANGUAGE sql STABLE;

-- ── agents table ──
-- Broker/Admin: βλέπει όλους
-- Team Leader: βλέπει μέλη του team + εαυτό
-- Agent: βλέπει μόνο εαυτό
CREATE POLICY agents_select ON agents FOR SELECT USING (
    auth.user_role() IN ('broker', 'admin')
    OR (auth.user_role() = 'team_leader' AND agent_id IN (
        SELECT tm.agent_id FROM team_members tm
        WHERE tm.team_id IN (
            SELECT tm2.team_id FROM team_members tm2
            WHERE tm2.agent_id = auth.user_agent_id()
        )
    ))
    OR (auth.user_role() = 'agent' AND agent_id = auth.user_agent_id())
);

-- ── properties table ──
-- Φιλτράρονται μέσω agent_id (ίδια λογική)
CREATE POLICY properties_select ON properties FOR SELECT USING (
    auth.user_role() IN ('broker', 'admin')
    OR (auth.user_role() = 'team_leader' AND (
        agent_id IS NULL OR agent_id IN (
            SELECT tm.agent_id FROM team_members tm
            WHERE tm.team_id IN (
                SELECT tm2.team_id FROM team_members tm2
                WHERE tm2.agent_id = auth.user_agent_id()
            )
        )
    ))
    OR (auth.user_role() = 'agent' AND (
        agent_id IS NULL OR agent_id = auth.user_agent_id()
    ))
);

-- ── Ίδιο pattern για: closings, exclusives, ypodikseis,
--    accountability_reports, billing_transactions
--    (φιλτράρονται μέσω agent_id)

-- ── status_changes, price_changes ──
-- Φιλτράρονται μέσω property_id → properties.agent_id
CREATE POLICY status_changes_select ON status_changes FOR SELECT USING (
    auth.user_role() IN ('broker', 'admin')
    OR EXISTS (
        SELECT 1 FROM properties p
        WHERE p.property_id = status_changes.property_id
        AND (p.agent_id IS NULL OR p.agent_id IN (
            SELECT tm.agent_id FROM team_members tm
            WHERE tm.team_id IN (
                SELECT tm2.team_id FROM team_members tm2
                WHERE tm2.agent_id = auth.user_agent_id()
            )
        ) OR p.agent_id = auth.user_agent_id())
    )
);
-- (price_changes: ίδιο pattern)

-- ── teams, team_members ──
-- Broker/Admin: βλέπει όλα
-- Team Leader: βλέπει μόνο το team του
-- Agent: βλέπει μόνο το team του (αν ανήκει σε κάποιο)
CREATE POLICY teams_select ON teams FOR SELECT USING (
    auth.user_role() IN ('broker', 'admin')
    OR team_id IN (
        SELECT tm.team_id FROM team_members tm
        WHERE tm.agent_id = auth.user_agent_id()
    )
);

-- ── targets_annual ──
CREATE POLICY targets_select ON targets_annual FOR SELECT USING (
    auth.user_role() IN ('broker', 'admin')
    OR agent_id = auth.user_agent_id()
);
```

**Σημείωση:** Αρχικά υλοποιούμε μόνο Broker role — ένα απλό `auth.user_role() IN ('broker', 'admin')` policy αρκεί. Τα team_leader/agent policies θα ενεργοποιηθούν στο Cycle 7.

### 5.5 Supabase Auth

| User | Email | Role (JWT claim) | agent_id |
|------|-------|------------------|----------|
| Broker | broker@remax-delta.gr | `broker` | NULL |
| Γιαννάκος Άκης | giannakos@remax-delta.gr | `team_leader` | 24 |
| Κυριακόπουλος Σ. | kyriako@remax-delta.gr | `agent` | 1 |

Users δημιουργούνται χειροκίνητα στο Supabase Dashboard (ή μέσω invite script).
Τα custom claims (`role`, `agent_id`) γράφονται στο `raw_user_meta_data`.

---

## 6. Sync Pipeline: SQLite → Supabase

### 6.1 sync_to_supabase.py

```python
"""Sync warehouse.sqlite → Supabase Postgres.

Runs after ETL:  python run.py --mode full && python sync_to_supabase.py
Or via scheduled task (Windows Task Scheduler / cron) every Monday 07:00.
"""

# Pseudo-flow:
# 1. Connect to local SQLite (read-only)
# 2. Connect to Supabase via supabase-py
# 3. For each sync table:
#    a. Read all rows from SQLite
#    b. Normalize dates (DD-MM-YYYY → YYYY-MM-DD)
#    c. Resolve agents (only canonical)
#    d. UPSERT to Supabase in **chunks of 1000 rows** (ON CONFLICT UPDATE)
#       - try/except per chunk — partial failures don't block remaining chunks
#       - Log failed chunks with table name, chunk index, error message
# 4. Log sync timestamp + status to sync_log table
# 5. Verify row counts match (hard checks — fail the run if counts diverge)
# 6. On failure: send email notification (via SMTP / Resend)
#    - To: admin email
#    - Subject: "[Remax Sync] FAILED — {table} — {error}"
#    - Body: sync_log entry + failed chunk details

CHUNK_SIZE = 1000  # rows per upsert batch

def sync_table(supabase, table_name, rows, conflict_cols):
    """Batch upsert with chunking and per-chunk error handling."""
    total = len(rows)
    success = 0
    errors = []
    for i in range(0, total, CHUNK_SIZE):
        chunk = rows[i:i + CHUNK_SIZE]
        try:
            supabase.table(table_name).upsert(chunk, on_conflict=','.join(conflict_cols)).execute()
            success += len(chunk)
        except Exception as e:
            errors.append({'chunk': i // CHUNK_SIZE, 'error': str(e), 'rows': len(chunk)})
            logger.error(f"Chunk {i//CHUNK_SIZE} failed for {table_name}: {e}")
    return {'total': total, 'success': success, 'errors': errors}
```

### 6.2 Sync strategy per table

| Table | Strategy | Key | Notes |
|-------|----------|-----|-------|
| agents | Full replace | agent_id | Only canonical (~47) |
| teams | Full replace | team_id | Only config source (3) |
| team_members | Full replace | (team_id, agent_id) | |
| properties | Upsert | property_id | ~7K, check payload_hash |
| status_changes | Upsert | (property_id, change_date, event_type) | ~13K |
| price_changes | Upsert | (property_id, change_date) | ~8K |
| closings | Upsert | (property_code, closing_date, source) | ~5K, normalize date |
| exclusives | Upsert | (property_code, sign_date, source) | ~900 |
| ypodikseis | Upsert | (property_id, showing_date, client_name, source) | ~800 |
| accountability_reports | Upsert | (agent_id, report_date) | ~500, normalize month |
| billing_transactions | Upsert | (office, billing_month, seq_num) | ~60 |
| targets_annual | Upsert | (agent_id, year) | ~30 |

### 6.3 Automated schedule

```
Windows Task Scheduler:
  ┌───────────────────────────────────────────────────────────────────┐
  │ Task: "Remax Weekly Sync"                                       │
  │ Trigger: Every Monday 07:00                                     │
  │ Action: run_weekly.bat                                          │
  │                                                                 │
  │ run_weekly.bat:                                                 │
  │   cd F:\Remax Data Warehouse                                    │
  │                                                                 │
  │   REM Wake up Supabase project if sleeping (free tier auto-sleep)│
  │   curl -s -o nul https://<PROJECT_REF>.supabase.co/rest/v1/     │
  │   timeout /t 5 /nobreak >nul                                    │
  │                                                                 │
  │   .venv\Scripts\python run.py --mode full                       │
  │   .venv\Scripts\python sync_to_supabase.py                      │
  └───────────────────────────────────────────────────────────────────┘
```

---

## 7. Τι θα δείχνει το Dashboard (Pages)

### Period Selector (Global)
Πάνω δεξιά: dropdown/tabs για χρονική περίοδο:
- **Εβδομάδα**: Τρέχουσα / Προηγούμενη (αν υπάρχουν accountability data)
- **Μήνας**: Dropdown μήνα (default: τελευταίος πλήρης μήνας)
- **Τρίμηνο**: Q1/Q2/Q3/Q4 (αν υπάρχουν ≥3 μήνες data)
- **Έτος**: 2026 / 2025 / 2024 κλπ (αν υπάρχουν data)

Τα queries φιλτράρουν με `WHERE period_start >= :start AND period_start <= :end` (DATE comparison).

### Page 1: Σύνοψη (Executive Summary)
- Top Agent & Top Team μήνα (by GCI)
- KPI cards: Καταγραφές, Αποκλειστικές, Δημοσιευμένα, Υποδείξεις, Προσφορές, Κλεισίματα, Συμβολαιοποιήσεις (CRM + ACC)
- Sales Funnel: Καταγραφές → Αποκλ. → Δημοσ. → Υποδ. → Προσφ. → Κλεισ. → Συμβ.
- Trend chart (6 τελευταίοι μήνες ή πλήρες έτος): bars + GCI line
- Office head-to-head: Λάρισα vs Κατερίνη

### Page 2: KPIs Αναλυτικά
- **Για κάθε metric** (7 συνολικά), ένα MetricSection component:
  - Header: CRM total, ACC total, Difference badge, per-office totals
  - **7 Tabs (Benchmarking 5 επιπέδων):**
    1. **Ανά Agent**: Ranked list (#1, #2, #3) με CRM vs ACC ανά agent
    2. **Ανά Team**: Team total + breakdown σε members + % συμμετοχή γραφείου. Τα 3 ενεργά teams + "Χωρίς Team" για unaffiliated agents
    3. **Γραφείο vs Γραφείο**: Λάρισα vs Κατερίνη — totals, M.O./agent, head-to-head
    4. **Peers Λάρισα**: Agents ranked εντός γραφείου Λάρισας, vs M.O. γραφείου
    5. **Peers Κατερίνη**: Agents ranked εντός γραφείου Κατερίνης, vs M.O. γραφείου
    6. **vs Επιχείρηση**: Κάθε Agent vs M.O. εταιρείας bar chart + Team vs M.O. εταιρείας
    7. **Chart**: Bar chart CRM vs ACC per agent + M.O. εταιρείας reference line
- **Αποκλειστικές bonus**: "4 Club" → ποιοι agents έχουν ≥4 **αποκλειστικές κατοικιών** ανά μήνα (χρησιμοποιεί `crm_exclusives_residential`, subcategory IN Διαμέρισμα/Μονοκατοικία/Μεζονέτα/Γκαρσονιέρα/Παραθεριστική/Βίλα). Agents κάτω από 4 σε κόκκινο highlight. CRM vs ACC side-by-side

### Page 3: Αποσύρσεις
- MetricSection για 2 κατηγορίες αποσύρσεων:
  - Τύπος 1: Ανενεργό / Expired / Σε εκκρεμότητα
  - Τύπος 2: Πωλητής / Ανταγωνιστής / Μεγάλη τιμή
- Ανάλυση λόγων απόσυρσης (10 κατηγορίες, parsed από description)

### Page 4: Funnel ανά Τύπο Ακινήτου
- Table: Κατηγορία / Υποκατηγορία → Καταγρ. → Αποκλ. → Δημοσ. → Υποδ. → Κλεισ. → Conv%
- Totals row + Grouped bar chart + Narrative summary

### Page 5: Κλεισίματα — Καρτέλες Ακινήτων
- Per property card:
  - Property code, τύπος, τοποθεσία, τ.μ., υπνοδ., όροφος, έτος
  - Ζητούμενη τιμή → Τιμή κλεισίματος → GCI
  - Listing agent + Buyer agent + Αγοραστής
  - Ημέρες ανά στάδιο: Ενεργοπ.→Αποκλ.→Δημοσ.→1η Υπόδ.→Deposit→Closing
  - Visual timeline + Expandable showings (buyer highlighted)

### Page 6: CRM vs Accountability
- Bar chart: CRM vs ACC ανά metric (aggregated)
- Per-agent deviation bar chart
- Key Insight narrative (auto-generated)
- Data Source Mapping table

### Page 7: GCI & Rankings
- GCI per agent chart + M.O. εταιρείας reference line
- Top 3 highlighted (gold/teal/blue)
- Office comparison: agents, GCI, καταγραφές, κλεισίματα, %, M.O.

---

## 8. React Architecture

### 8.1 Project Structure

```
react-dashboard/
├── public/
│   └── favicon.ico
├── src/
│   ├── main.tsx
│   ├── App.tsx                    # Auth gate + Router
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client init
│   │   └── types.ts              # TypeScript interfaces
│   ├── hooks/
│   │   ├── useAuth.ts            # Auth state, role, agent_id
│   │   ├── usePeriod.ts          # Selected period (week/month/quarter/year)
│   │   ├── useMetrics.ts         # v_combined_metrics query
│   │   ├── useAgents.ts          # agents + teams + members
│   │   ├── useClosings.ts        # closings + events + showings
│   │   ├── useFunnel.ts          # v_funnel_by_type query
│   │   ├── useWithdrawals.ts     # v_withdrawal_reasons query
│   │   └── useTrend.ts           # 6-month / yearly trend
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx         # Logo, period selector, user menu
│   │   │   ├── PageNav.tsx        # Page navigation tabs
│   │   │   └── Footer.tsx         # Last sync, data source, confidential
│   │   ├── ui/
│   │   │   ├── KPICard.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Pill.tsx
│   │   │   ├── TabBar.tsx
│   │   │   ├── MiniBar.tsx
│   │   │   ├── Card.tsx
│   │   │   └── SectionHeader.tsx
│   │   ├── metrics/
│   │   │   ├── MetricSection.tsx       # The big reusable KPI module (7 tabs)
│   │   │   ├── ComparisonRow.tsx
│   │   │   ├── AgentRankTab.tsx        # Tab 1: Ανά Agent
│   │   │   ├── TeamBreakdownTab.tsx    # Tab 2: Ανά Team
│   │   │   ├── OfficeVsOfficeTab.tsx   # Tab 3: Γραφείο vs Γραφείο
│   │   │   ├── PeersTab.tsx            # Tab 4-5: Peers ανά γραφείο
│   │   │   ├── VsCompanyTab.tsx        # Tab 6: vs Επιχείρηση
│   │   │   └── ChartTab.tsx            # Tab 7: CRM vs ACC chart
│   │   ├── PropertyCard.tsx
│   │   └── LoginForm.tsx
│   ├── pages/
│   │   ├── Overview.tsx           # Page 1
│   │   ├── KPIDetail.tsx          # Page 2
│   │   ├── Withdrawals.tsx        # Page 3
│   │   ├── Funnel.tsx             # Page 4
│   │   ├── PropertyCards.tsx      # Page 5
│   │   ├── CRMvsACC.tsx           # Page 6
│   │   └── GCIRankings.tsx        # Page 7
│   └── styles/
│       └── theme.ts               # Color constants
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### 8.2 Data Hook Abstraction

Κάθε hook κρύβει τη data source. Αν μελλοντικά αλλάξουμε backend, αλλάζουν μόνο τα hooks:

```typescript
// hooks/useMetrics.ts
// period_start είναι DATE (π.χ. '2026-02-01') — φιλτράρει με gte/lte
export function useMetrics(periodStart: string, periodEnd: string) {
  const supabase = useSupabase();
  const { role, agentId } = useAuth();

  return useQuery({
    queryKey: ['metrics', periodStart, periodEnd],
    queryFn: async () => {
      const { data } = await supabase
        .from('v_combined_metrics')
        .select('*')
        .gte('period_start', periodStart)    // DATE comparison
        .lte('period_start', periodEnd);     // DATE comparison

      // RLS handles row filtering automatically
      // For agent view: hide other agents' names (client-side)
      return data;
    },
  });
}
```

### 8.3 Period Logic

```typescript
// hooks/usePeriod.ts
// period_start/end είναι DATE strings (YYYY-MM-DD, πάντα 1η μέρα μήνα)
// Αυτό δίνει native date ranges, rolling months, quarter/year boundaries
type PeriodType = 'week' | 'month' | 'quarter' | 'year';

interface Period {
  type: PeriodType;
  start: string;   // 'YYYY-MM-DD' (1η μέρα, π.χ. '2026-02-01')
  end: string;     // 'YYYY-MM-DD' (1η μέρα τελευταίου μήνα, π.χ. '2026-02-01')
  label: string;   // 'Φεβρουάριος 2026' / 'Q1 2026' / '2026'
}

// Default: last complete month → start=end='2026-01-01'
// Week: current ISO week → start=end=date_trunc('month', monday)
// Quarter: Q1 → start='2026-01-01', end='2026-03-01'
// Year: 2026 → start='2026-01-01', end='2026-12-01'
// Rolling 6 months: start='2025-08-01', end='2026-01-01'
// Year-over-year: compare two Period objects with same month range
```

---

## 9. Shared UI Components

| Component | Description |
|-----------|-------------|
| `KPICard` | Colored left border, label, value, subtitle |
| `Badge` | Colored pill with text (✓ Match, +5, Δ +12%) |
| `Pill` | Label + large value in colored container |
| `MetricSection` | Reusable KPI module: header + 7 tabs (Agent/Team/Office vs Office/Peers Λάρισα/Peers Κατερίνη/vs Επιχείρηση/Chart) |
| `ComparisonRow` | CRM vs ACC inline row with rank, dots, badge |
| `TabBar` | Pill-style tab switcher |
| `MiniBar` | Thin progress bar for inline rankings |
| `PropertyCard` | Full property history card with timeline |
| `SectionHeader` | Icon + title + subtitle |
| `Card` | White rounded container with border |
| `PageNav` | Top navigation bar with page buttons |
| `LoginForm` | Email/password login |

---

## 10. Color System

```
navy:    #0C1E3C    (headers, primary text)
blue:    #1B5299    (CRM indicator, Καταγραφές)
teal:    #168F80    (Αποκλειστικές, success secondary)
gold:    #C9961A    (ACC indicator, Δημοσιευμένα, GCI)
purple:  #6B5CA5    (Υποδείξεις)
orange:  #D4722A    (Προσφορές, warnings)
green:   #1D7A4E    (Κλεισίματα, success)
accent:  #DC3545    (Συμβολαιοποιήσεις, errors, negative diffs)
bg:      #F7F6F3    (page background)
card:    #FFFFFF    (card background)
light:   #EFECEA    (secondary backgrounds, tab inactive)
border:  #DDD8D0    (borders, separators)
muted:   #8A94A0    (secondary text, labels)
```

---

## 11. Development Cycles (Scrum Sprints)

### Cycle 0: Foundation
- [ ] Supabase project creation + schema (tables, views, RLS)
- [ ] `sync_to_supabase.py` — SQLite → Supabase sync script
- [ ] Run first sync, verify data in Supabase Dashboard
- [ ] Vite + React + TypeScript + Tailwind + Recharts project setup
- [ ] Supabase client init (`lib/supabase.ts`)
- [ ] Auth: LoginForm + useAuth hook (broker role only initially)
- [ ] TypeScript types (`lib/types.ts`)
- [ ] Data hooks: `useMetrics`, `useAgents`, `usePeriod`
- [ ] Layout shell: Header (with period selector) + PageNav + Footer
- **Deliverable**: App loads real data from Supabase, authenticated, shows nav

### Cycle 1: Executive Summary (Page 1)
- [ ] Top Agent & Top Team of the month (by GCI)
- [ ] KPI cards row (7 metrics: CRM + ACC)
- [ ] Sales Funnel visualization
- [ ] Trend ComposedChart (bars + GCI line)
- [ ] Office head-to-head cards
- **Deliverable**: Fully functional overview page with real Supabase data

### Cycle 2: KPIs Αναλυτικά (Page 2)
- [ ] Reusable `MetricSection` component (header + 7 tabs)
- [ ] Tab 1: Ανά Agent — ranked list (#1, #2, #3), CRM vs ACC
- [ ] Tab 2: Ανά Team — team total, members breakdown, % γραφείου. 3 active teams + "Χωρίς Team"
- [ ] Tab 3: Γραφείο vs Γραφείο — Λάρισα vs Κατερίνη totals + M.O./agent
- [ ] Tab 4: Peers Λάρισα — agents ranked εντός γραφείου, vs M.O. γραφείου
- [ ] Tab 5: Peers Κατερίνη — agents ranked εντός γραφείου, vs M.O. γραφείου
- [ ] Tab 6: vs Επιχείρηση — Agent vs M.O. εταιρείας + Team vs M.O. εταιρείας
- [ ] Tab 7: Chart — CRM vs ACC bar chart per agent + M.O. reference line
- [ ] 7x MetricSection instances (μία ανά KPI)
- [ ] "4 Club" section — αποκλειστικές **κατοικιών** (crm_exclusives_residential ≥ 4), κόκκινο highlight < 4
- **Deliverable**: All 7 KPIs with full 5-level benchmarking drill-down

### Cycle 3: Αποσύρσεις + Funnel (Pages 3-4)
- [ ] Αποσύρσεις: MetricSections + reason breakdown
- [ ] `useWithdrawals` hook + `v_withdrawal_reasons` view
- [ ] Funnel table + chart + narrative
- [ ] `useFunnel` hook + `v_funnel_by_type` view
- **Deliverable**: Complete withdrawal analysis + pipeline view

### Cycle 4: Property Cards (Page 5)
- [ ] `useClosings` hook — closings + events + showings per property
- [ ] PropertyCard component: header, agents, price
- [ ] Stage durations computed from events
- [ ] Visual timeline with dots and day badges
- [ ] Expandable showings table with buyer highlight
- [ ] Average days per stage summary
- **Deliverable**: Rich property cards with full history

### Cycle 5: CRM vs ACC + GCI & Rankings (Pages 6-7)
- [ ] CRM vs ACC: aggregated bar chart, per-agent deviation
- [ ] Key Insight narrative (auto-generated)
- [ ] Data Source Mapping reference table
- [ ] GCI per agent chart + company average reference line
- [ ] Office comparison
- **Deliverable**: Data integrity + financial views

### Cycle 6: Multi-Period + Polish + Deploy
- [ ] Period selector: εβδομάδα/μήνα/τρίμηνο/έτος logic
- [ ] Quarterly aggregation views
- [ ] Yearly aggregation views
- [ ] Responsive design (tablet/mobile)
- [ ] Loading states, empty states, error handling
- [ ] GitHub repo + Vercel deployment
- [ ] Windows Task Scheduler setup for weekly sync
- [ ] README with full instructions
- **Deliverable**: Production-ready deployed dashboard

### Cycle 7 (Future): Role Expansion
- [ ] Team Leader role: RLS policies, filtered views
- [ ] Agent role: Own data only + company averages (anonymized)
- [ ] User management page (Admin)
- [ ] Invite flow (email invitations)
- **Deliverable**: Multi-role access

---

## 12. Deployment Flow

```
Weekly (automated, κάθε Δευτέρα 07:00):
  1. Windows Task Scheduler triggers run_weekly.bat
  2. python run.py --mode full        ← ETL: CRM + Sheets + Excel → SQLite
  3. python sync_to_supabase.py       ← SQLite → Supabase Postgres
  4. Dashboard auto-reflects new data (no deploy needed)

Frontend (on code changes only):
  1. Developer pushes to GitHub
  2. Vercel auto-builds and deploys
  3. No data change — just UI updates

Access:
  - https://remax-report.vercel.app
  - Login required (Supabase Auth)
  - Broker sees everything, future roles see filtered data
  - Footer shows: last sync timestamp
```

---

## 13. Ρίσκα & Μετριασμός

| Ρίσκο | Μετριασμός |
|--------|------------|
| Supabase free tier limit | 500 MB limit, εμείς ~15 MB — δεν θα φτάσουμε ποτέ |
| Supabase downtime | Data cached στο frontend (React Query), stale-while-revalidate |
| Accountability month=0 στη βάση | Sync script: parse month from report_date ISO string |
| Closings date DD-MM-YYYY format | Sync script: normalize σε YYYY-MM-DD στο Postgres |
| Duplicate agents (102 vs 47) | Sync script: μόνο canonical agents |
| Team CRM accounts | Include in team totals but exclude from individual views |
| Μεγάλα descriptions (9.5K chars) | Trim σε 200 chars στο sync, full text δεν χρειάζεται |
| Συμβολαιοποιήσεις: no CRM event | Χρησιμοποιούμε billing_transactions, note στο UI |
| Privacy (agent names, GCI) | Auth required + RLS policies |
| Weekly sync fails | sync_log table + error notifications (email/log) |
| Supabase project sleep (free tier) | Free tier: project sleeps after 1 week inactivity. Αντιμετώπιση: `curl` ping στο `run_weekly.bat` πριν το sync ξυπνάει το project αυτόματα. Αν τυχόν πάει sleep, wakes up σε ~60 sec |

---

## 14. Τεχνολογίες — Final Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React 19 + Vite 6 + TypeScript | Fast, typed, component-based |
| Styling | Tailwind CSS 4 | Utility-first, consistent, responsive |
| Charts | Recharts 2 | React-native, declarative, composable |
| Data Fetching | TanStack Query (React Query) 5 | Cache, stale-while-revalidate, query keys, loading/error states |
| Backend | Supabase (Postgres 15) | Free, managed, Auth + RLS + REST API |
| Auth | Supabase Auth | Built-in, email/password, JWT claims |
| Data Sync | Python (supabase-py) | Already have Python venv, same machine |
| Hosting | Vercel | Free, auto-deploy from GitHub |
| SCM | GitHub | Standard |
| Scheduling | Windows Task Scheduler | Already on the machine, no extra infra |

---

## 15. Data Quality & Integrity — Ευρήματα & Κανόνες Sync

Ανάλυση της `warehouse.sqlite` αποκάλυψε τα παρακάτω θέματα. Κάθε ένα αντιμετωπίζεται στο `sync_to_supabase.py`.

### 15.1 Referential Integrity — OK

| Έλεγχος | Αποτέλεσμα |
|---------|------------|
| Properties με orphan agent_id | **0** (100% valid) |
| Agents canonical (μέσω agent_aliases) | **47** / 102 total |
| Properties agent_id → agents | Όλοι υπάρχουν |

Δεν υπάρχει πρόβλημα referential integrity μεταξύ πινάκων — τα foreign keys είναι σωστά.

### 15.2 NULL agent_ids

| Πίνακας | NULL agent_id | Σύνολο | % | Πηγή |
|---------|--------------|--------|---|------|
| properties | 599 | 6,893 | 8.7% | Όλα από `crm_sqlite` (active ακίνητα χωρίς ανάθεση) |
| exclusives | 318 | 858 | 37.1% | Αρχεία Excel (ιστορικά) |
| closings | 31 | 4,867 | 0.6% | `crm_status_change` με κενό property_code |

**Exclusives NULL ανά source:**
| Source | NULL agent | Total | Σημείωση |
|--------|-----------|-------|----------|
| excel_archive_larissa | 208 | 208 | 100% — μη ανακτήσιμα |
| excel_archive_katerini | 110 | 595 | 18.5% — μερικώς ανακτήσιμα |
| gsheet_exclusive_* | 0 | 55 | 0% — πλήρη |

**Sync κανόνας:**
- Records με NULL agent_id → **συμπεριλαμβάνονται** στο Supabase (agent_id = NULL)
- Στα Postgres views: `WHERE agent_id IS NOT NULL` σε per-agent aggregations
- Στα totals/funnel: συμπεριλαμβάνονται κανονικά
- Δεν προσπαθούμε αυτόματη ανάθεση — το κάνει ο Broker χειροκίνητα αν θέλει

### 15.3 Duplicate Closings (Multi-Source)

**Πρόβλημα:** 1,090 ακίνητα έχουν εγγραφές closing από **2 πηγές** (gsheet_closings + crm_status_change).

| Source | Εγγραφές |
|--------|---------|
| gsheet_closings | 3,436 |
| crm_status_change | 1,431 |
| **Σύνολο** | **4,867** |

Παράδειγμα: Ακίνητο "1116-1234" εμφανίζεται ως closing και στο Google Sheet export και στο CRM status change log.

**Sync κανόνας — Dedup Strategy:**
1. Group by `(property_code, closing_month)` — ίδιο ακίνητο, ίδιος μήνας = ίδιο event
2. **Προτεραιότητα:** `gsheet_closings` > `crm_status_change` (το gsheet έχει πληρέστερα δεδομένα: price, GCI, closing_type)
3. Αν υπάρχει μόνο crm_status_change → κρατάμε αυτό
4. Στο Supabase: unique constraint `(property_code, closing_month)` — η dedup γίνεται στο sync script, **πριν** το upsert

**Αποτέλεσμα:** ~3,777 unique closings (vs 4,867 raw rows) → ~22% μείωση

### 15.4 Accountability Duplicates

**Πρόβλημα:** 96 agent/date combinations με >1 εγγραφή (από 442 συνολικές). Πιθανή αιτία: πολλαπλά submits ή re-syncs.

**Sync κανόνας:**
1. Group by `(agent_id, DATE(report_date))`
2. Αν >1 row, κράτα αυτό με το **μεγαλύτερο `report_date`** (πιο πρόσφατο timestamp = πιο ενημερωμένο)
3. Στο Supabase: unique constraint `(agent_id, report_date::date)`
4. Monthly aggregation στo view: `SUM()` μετά τη dedup

### 15.5 Corrupt/Invalid Dates

**Status changes:** 4 εγγραφές με αδύνατες ημερομηνίες:
- Εύρος: `2027-09-27` έως `6945-07-25`
- Πιθανή αιτία: CRM data entry errors

**Sync κανόνας:**
```python
# Exclude dates > today + 1 year
MAX_VALID_DATE = (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')
# Filter: WHERE change_date <= MAX_VALID_DATE
```
- Αυτές οι 4 εγγραφές **αποκλείονται** από το sync
- Log warning για manual review

### 15.6 Date Format Normalization

Οι ημερομηνίες στη SQLite είναι σε **5 διαφορετικά formats**:

| Format | Παράδειγμα | Πίνακας | Ενέργεια |
|--------|-----------|---------|----------|
| `YYYY-MM-DD` | `2023-02-10` | status_changes, exclusives | As-is → DATE |
| `DD-MM-YYYY` | `06-10-2025` | closings | Reverse → `2025-10-06` |
| `DD/MM/YYYY` | `29/12/2025` | closings (μερικά) | Reverse → `2025-12-29` |
| ISO 8601 + ms | `2026-01-12T20:11:20.906Z` | accountability | Parse → TIMESTAMPTZ |
| ISO 8601 | `2026-02-15T00:20:59` | properties.first_pub_date | Parse → TIMESTAMPTZ |

**Sync κανόνας:**
```python
def normalize_date(val: str) -> str:
    """Detect format and convert to YYYY-MM-DD."""
    if not val:
        return None
    # DD-MM-YYYY or DD/MM/YYYY
    if re.match(r'^\d{2}[-/]\d{2}[-/]\d{4}$', val):
        parts = re.split(r'[-/]', val)
        return f'{parts[2]}-{parts[1]}-{parts[0]}'
    # Already ISO
    return val[:10]  # strip time part if present
```

### 15.7 Accountability month=0 Issue

Στον πίνακα `accountability_reports`, τα πεδία `month` και `year` μπορεί να είναι 0 ή NULL. Η πραγματική ημερομηνία βρίσκεται στο `report_date` (ISO timestamp).

**Sync κανόνας:**
- Αγνοούμε `month` και `year` columns
- Χρησιμοποιούμε `report_date` για υπολογισμό period: `date_trunc('month', report_date)::date AS period_start`
- Στο Supabase: αποθηκεύουμε `report_date` ως TIMESTAMPTZ, και παράγουμε `period_start` (DATE) στο view

### 15.8 CRS Codes — Μη αξιόπιστα

Το πεδίο `crs_code` στον πίνακα `agents` περιέχει **email addresses** (από GrowthCFO import), όχι πραγματικούς κωδικούς CRS.

- Παράδειγμα: `crs_code = 'agent@remax.gr'` αντί για `'1116'`
- Οι πραγματικοί CRS codes εμφανίζονται ως prefix στα property_code (π.χ. `1116-12345`)
- **Δεν χρησιμοποιούμε** το `crs_code` πεδίο στο dashboard
- Μελλοντικά: extract CRS από property_code prefix αν χρειαστεί

### 15.9 Συνοπτικοί Κανόνες sync_to_supabase.py

```python
SYNC_RULES = {
    'closings': {
        'dedup': ('property_code', 'closing_month'),
        'priority': ['gsheet_closings', 'crm_status_change'],
        'date_normalize': 'closing_date',
        'exclude_empty_property_code': True,
    },
    'accountability_reports': {
        'dedup': ('agent_id', 'report_date::date'),
        'keep': 'latest_timestamp',
        'ignore_columns': ['month', 'year'],
    },
    'status_changes': {
        'exclude': 'change_date > MAX_VALID_DATE',
        'date_validate': True,
    },
    'exclusives': {
        'allow_null_agent': True,  # historical archives
    },
    'properties': {
        'allow_null_agent': True,  # unassigned CRM properties
        'date_normalize': 'first_pub_date',
    },
    'agents': {
        'filter': "source='canonical'",  # only 47 canonical agents
    },
    'all_tables': {
        'date_normalize': True,         # all date fields → YYYY-MM-DD
        'trim_descriptions': 200,        # max chars for description fields
        'canonical_agents_only': True,   # resolve via agent_aliases
    },
}
```

### 15.10 Post-Sync Verification Checklist

Μετά κάθε sync, το script ελέγχει:

| Έλεγχος | Expected |
|---------|----------|
| `SELECT COUNT(*) FROM agents` | ~47 |
| `SELECT COUNT(*) FROM closings` | ~3,777 (after dedup) |
| `SELECT COUNT(*) FROM accountability_reports` | < 442 (after dedup) |
| `SELECT COUNT(*) FROM status_changes WHERE change_date > NOW() + INTERVAL '1 year'` | 0 |
| `SELECT COUNT(*) FROM closings WHERE closing_date IS NULL` | 0 |
| `SELECT COUNT(DISTINCT agent_id) FROM v_combined_metrics WHERE agent_id IS NOT NULL` | ~30-40 |
| No orphan foreign keys | 0 violations |

Αν κάποιος έλεγχος αποτύχει → log error + αποθήκευση στο `sync_log` table.
