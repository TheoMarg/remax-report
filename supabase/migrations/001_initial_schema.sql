-- ============================================================
-- RE/MAX Delta Ktima — Warehouse Dashboard
-- Migration 001: Initial Schema
-- Tables, Views (security_invoker), RLS, Indexes
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. TABLES
-- ────────────────────────────────────────────────────────────

-- ── agents ──
CREATE TABLE agents (
    agent_id        INT PRIMARY KEY,
    canonical_name  TEXT NOT NULL UNIQUE,
    first_name      TEXT,
    last_name       TEXT,
    office          TEXT,
    crs_code        TEXT,
    start_date      DATE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_team         BOOLEAN NOT NULL DEFAULT FALSE,
    notes           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── teams ──
CREATE TABLE teams (
    team_id     INT PRIMARY KEY,
    team_name   TEXT NOT NULL UNIQUE,
    crm_team_name TEXT,
    source      TEXT NOT NULL DEFAULT 'config'
);

-- ── team_members ──
CREATE TABLE team_members (
    id          SERIAL PRIMARY KEY,
    team_id     INT NOT NULL REFERENCES teams(team_id) ON DELETE CASCADE,
    agent_id    INT NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    role        TEXT DEFAULT 'member',
    source      TEXT NOT NULL DEFAULT 'config',
    UNIQUE(team_id, agent_id)
);

-- ── properties ──
CREATE TABLE properties (
    property_id     TEXT PRIMARY KEY,
    crm_code        TEXT,
    property_code   TEXT,
    agent_id        INT REFERENCES agents(agent_id),
    category        TEXT,
    subcategory     TEXT,
    area            TEXT,
    region          TEXT,
    prefecture      TEXT,
    address         TEXT,
    price           NUMERIC(12,2),
    size_sqm        NUMERIC(8,2),
    plot_sqm        NUMERIC(10,2),
    bedrooms        SMALLINT,
    floor           TEXT,
    year_built      TEXT,
    energy_class    TEXT,
    is_exclusive    BOOLEAN DEFAULT FALSE,
    exclusive_start DATE,
    exclusive_end   DATE,
    is_retired      BOOLEAN DEFAULT FALSE,
    retirement_date DATE,
    retirement_reason TEXT,
    days_on_market  INT,
    first_pub_date  TIMESTAMPTZ,
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    payload_hash    TEXT,
    first_seen_at   TIMESTAMPTZ NOT NULL,
    last_seen_at    TIMESTAMPTZ NOT NULL,
    source          TEXT NOT NULL DEFAULT 'crm_sqlite',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    broker_code     TEXT
);

-- ── status_changes ──
CREATE TABLE status_changes (
    id              SERIAL PRIMARY KEY,
    property_id     TEXT NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    change_date     DATE,
    description     TEXT,
    event_type      TEXT,
    source          TEXT NOT NULL DEFAULT 'crm_sqlite',
    UNIQUE(property_id, change_date, event_type)
);

-- ── price_changes ──
CREATE TABLE price_changes (
    id              SERIAL PRIMARY KEY,
    property_id     TEXT NOT NULL REFERENCES properties(property_id) ON DELETE CASCADE,
    change_date     DATE,
    old_price       NUMERIC(12,2),
    new_price       NUMERIC(12,2),
    change_eur      NUMERIC(12,2),
    change_pct      NUMERIC(6,2),
    source          TEXT NOT NULL DEFAULT 'crm_sqlite',
    UNIQUE(property_id, change_date, old_price, new_price)
);

-- ── closings ──
CREATE TABLE closings (
    id              SERIAL PRIMARY KEY,
    agent_id        INT REFERENCES agents(agent_id),
    property_id     TEXT REFERENCES properties(property_id),
    property_code   TEXT,
    closing_date    DATE,
    closing_type    TEXT,
    price           NUMERIC(12,2),
    gci             NUMERIC(12,2),
    source          TEXT NOT NULL,
    source_detail   TEXT,
    UNIQUE(property_code, closing_date, source)
);

-- ── exclusives ──
CREATE TABLE exclusives (
    id              SERIAL PRIMARY KEY,
    agent_id        INT REFERENCES agents(agent_id),
    property_code   TEXT,
    property_id     TEXT REFERENCES properties(property_id),
    owner_name      TEXT,
    sign_date       DATE,
    end_date        DATE,
    office          TEXT,
    status          TEXT,
    source          TEXT NOT NULL,
    UNIQUE(property_code, sign_date, source)
);

-- ── ypodikseis (showings) ──
CREATE TABLE ypodikseis (
    id              SERIAL PRIMARY KEY,
    agent_id        INT REFERENCES agents(agent_id),
    property_id     TEXT REFERENCES properties(property_id),
    showing_date    DATE,
    client_name     TEXT,
    manager_name    TEXT,
    source          TEXT NOT NULL,
    UNIQUE(property_id, showing_date, client_name, source)
);

-- ── accountability_reports ──
CREATE TABLE accountability_reports (
    id                      SERIAL PRIMARY KEY,
    agent_id                INT NOT NULL REFERENCES agents(agent_id),
    report_date             TIMESTAMPTZ NOT NULL,
    year                    SMALLINT,
    month                   SMALLINT,
    week                    SMALLINT,
    cold_calls              INT DEFAULT 0,
    follow_up               INT DEFAULT 0,
    viber_sms               INT DEFAULT 0,
    mail_newsletter         INT DEFAULT 0,
    social_media            INT DEFAULT 0,
    videos                  INT DEFAULT 0,
    follow_up_assignment    INT DEFAULT 0,
    follow_up_demand        INT DEFAULT 0,
    leads_total             INT DEFAULT 0,
    leads_in_person         INT DEFAULT 0,
    cultivation_area        INT DEFAULT 0,
    eight_by_eight          INT DEFAULT 0,
    thirty_three_touches    INT DEFAULT 0,
    havent_mets             INT DEFAULT 0,
    mets                    INT DEFAULT 0,
    listings                INT DEFAULT 0,
    meetings_sale           INT DEFAULT 0,
    meetings_rent           INT DEFAULT 0,
    meetings_buyer          INT DEFAULT 0,
    meetings_seller         INT DEFAULT 0,
    meetings_landlord       INT DEFAULT 0,
    meetings_tenant         INT DEFAULT 0,
    showings_sale           INT DEFAULT 0,
    showings_rent           INT DEFAULT 0,
    exclusive_mandate       INT DEFAULT 0,
    simple_mandate_sale     INT DEFAULT 0,
    exclusive_rent_hi       INT DEFAULT 0,
    exclusive_rent_lo       INT DEFAULT 0,
    simple_rent             INT DEFAULT 0,
    signed_offer            INT DEFAULT 0,
    deposit                 INT DEFAULT 0,
    appraisals              INT DEFAULT 0,
    closing_sale            INT DEFAULT 0,
    closing_rent            INT DEFAULT 0,
    transactions_rent_hi    INT DEFAULT 0,
    transactions_rent_lo    INT DEFAULT 0,
    transactions_sale_hi    INT DEFAULT 0,
    transactions_sale_lo    INT DEFAULT 0,
    cooperations            INT DEFAULT 0,
    photography             INT DEFAULT 0,
    a4_flyers               INT DEFAULT 0,
    circular                INT DEFAULT 0,
    open_house              INT DEFAULT 0,
    signage                 INT DEFAULT 0,
    matterport              INT DEFAULT 0,
    video_property          INT DEFAULT 0,
    ads                     INT DEFAULT 0,
    partner_proposal        INT DEFAULT 0,
    comments                TEXT,
    referral                INT DEFAULT 0,
    conference              INT DEFAULT 0,
    advertising             INT DEFAULT 0,
    absences                INT DEFAULT 0,
    letter                  INT DEFAULT 0,
    loan                    INT DEFAULT 0,
    proposal                INT DEFAULT 0,
    extra_comments          TEXT,
    source                  TEXT NOT NULL DEFAULT 'gsheet_accountability',
    UNIQUE(agent_id, report_date)
);

-- ── billing_transactions ──
CREATE TABLE billing_transactions (
    id              SERIAL PRIMARY KEY,
    agent_id        INT REFERENCES agents(agent_id),
    office          TEXT NOT NULL,
    billing_month   TEXT NOT NULL,        -- 'YYYY-MM'
    seq_num         INT,
    property_code   TEXT,
    property_type   TEXT,
    property_value  NUMERIC(12,2),
    gci             NUMERIC(12,2) NOT NULL,
    is_rental       BOOLEAN NOT NULL DEFAULT FALSE,
    seller_name     TEXT,
    buyer_name      TEXT,
    referral        TEXT,
    rental_col      TEXT,
    source_file     TEXT NOT NULL,
    property_id     TEXT REFERENCES properties(property_id),
    UNIQUE(office, billing_month, seq_num)
);

-- ── targets_annual ──
CREATE TABLE targets_annual (
    id                  SERIAL PRIMARY KEY,
    agent_id            INT NOT NULL REFERENCES agents(agent_id),
    year                SMALLINT NOT NULL,
    office              TEXT,
    gci_target          NUMERIC(12,2),
    gci_realistic       NUMERIC(12,2),
    exclusives_target   INT,
    source              TEXT NOT NULL,
    UNIQUE(agent_id, year, source)
);

-- ── sync_log ──
CREATE TABLE sync_log (
    id              SERIAL PRIMARY KEY,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at        TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'running',   -- running / success / partial / failed
    tables_synced   JSONB,                             -- {table: {total, success, errors}}
    error_message   TEXT,
    row_counts      JSONB                              -- {table: count} post-sync verification
);


-- ────────────────────────────────────────────────────────────
-- 2. INDEXES
-- ────────────────────────────────────────────────────────────

-- agents
CREATE INDEX idx_agents_office        ON agents(office);
CREATE INDEX idx_agents_active        ON agents(is_active);

-- properties
CREATE INDEX idx_properties_agent     ON properties(agent_id);
CREATE INDEX idx_properties_code      ON properties(property_code);
CREATE INDEX idx_properties_retired   ON properties(is_retired);
CREATE INDEX idx_properties_broker    ON properties(broker_code);
CREATE INDEX idx_properties_subcat    ON properties(subcategory);

-- status_changes
CREATE INDEX idx_sc_property          ON status_changes(property_id);
CREATE INDEX idx_sc_date              ON status_changes(change_date);
CREATE INDEX idx_sc_type              ON status_changes(event_type);
CREATE INDEX idx_sc_date_type         ON status_changes(change_date, event_type);

-- price_changes
CREATE INDEX idx_pc_property          ON price_changes(property_id);
CREATE INDEX idx_pc_date              ON price_changes(change_date);

-- closings
CREATE INDEX idx_closings_agent       ON closings(agent_id);
CREATE INDEX idx_closings_date        ON closings(closing_date);
CREATE INDEX idx_closings_code        ON closings(property_code);

-- exclusives
CREATE INDEX idx_exclusives_agent     ON exclusives(agent_id);
CREATE INDEX idx_exclusives_code      ON exclusives(property_code);
CREATE INDEX idx_exclusives_sign      ON exclusives(sign_date);

-- ypodikseis
CREATE INDEX idx_ypodikseis_agent     ON ypodikseis(agent_id);
CREATE INDEX idx_ypodikseis_date      ON ypodikseis(showing_date);

-- accountability_reports
CREATE INDEX idx_acc_agent            ON accountability_reports(agent_id);
CREATE INDEX idx_acc_date             ON accountability_reports(report_date);

-- billing_transactions
CREATE INDEX idx_billing_agent        ON billing_transactions(agent_id);
CREATE INDEX idx_billing_month        ON billing_transactions(billing_month);

-- targets_annual
CREATE INDEX idx_targets_agent        ON targets_annual(agent_id);

-- team_members
CREATE INDEX idx_tm_agent             ON team_members(agent_id);
CREATE INDEX idx_tm_team              ON team_members(team_id);


-- ────────────────────────────────────────────────────────────
-- 3. VIEWS (all with security_invoker = true)
-- ────────────────────────────────────────────────────────────

-- ══ v_monthly_crm_metrics ══
-- Status-change based metrics per agent per month
CREATE VIEW v_monthly_crm_metrics
WITH (security_invoker = true) AS
SELECT
    date_trunc('month', sc.change_date)::date   AS period_start,
    p.agent_id,
    COUNT(*) FILTER (WHERE sc.event_type = 'activation')    AS registrations,
    COUNT(*) FILTER (WHERE sc.event_type = 'deposit')       AS offers,
    COUNT(*) FILTER (WHERE sc.event_type = 'deactivation')  AS withdrawals
FROM status_changes sc
JOIN properties p ON sc.property_id = p.property_id
WHERE p.agent_id IS NOT NULL
  AND sc.change_date IS NOT NULL
GROUP BY 1, 2;


-- ══ v_monthly_exclusives ══
-- Exclusives per agent per month, with residential sub-count
CREATE VIEW v_monthly_exclusives
WITH (security_invoker = true) AS
SELECT
    date_trunc('month', e.sign_date)::date      AS period_start,
    e.agent_id,
    COUNT(*)                                     AS exclusives,
    COUNT(*) FILTER (WHERE p.subcategory IN (
        'Διαμέρισμα','Μονοκατοικία','Μεζονέτα',
        'Γκαρσονιέρα','Παραθεριστική Κατοικία','Βίλα',
        'Συγκρότημα Κατοικιών'
    ))                                           AS exclusives_residential
FROM exclusives e
LEFT JOIN properties p ON e.property_id = p.property_id
WHERE e.agent_id IS NOT NULL
  AND e.sign_date IS NOT NULL
GROUP BY 1, 2;


-- ══ v_monthly_published ══
-- Newly published properties per agent per month
CREATE VIEW v_monthly_published
WITH (security_invoker = true) AS
SELECT
    date_trunc('month', p.first_pub_date)::date AS period_start,
    p.agent_id,
    COUNT(*)                                     AS published
FROM properties p
WHERE p.agent_id IS NOT NULL
  AND p.first_pub_date IS NOT NULL
GROUP BY 1, 2;


-- ══ v_monthly_showings ══
-- Showings per agent per month
CREATE VIEW v_monthly_showings
WITH (security_invoker = true) AS
SELECT
    date_trunc('month', y.showing_date)::date   AS period_start,
    y.agent_id,
    COUNT(*)                                     AS showings
FROM ypodikseis y
WHERE y.agent_id IS NOT NULL
  AND y.showing_date IS NOT NULL
GROUP BY 1, 2;


-- ══ v_monthly_closings ══
-- Closings per agent per month
CREATE VIEW v_monthly_closings
WITH (security_invoker = true) AS
SELECT
    date_trunc('month', c.closing_date)::date   AS period_start,
    c.agent_id,
    COUNT(*)                                     AS closings
FROM closings c
WHERE c.agent_id IS NOT NULL
  AND c.closing_date IS NOT NULL
GROUP BY 1, 2;


-- ══ v_monthly_billing ══
-- Billing transactions per agent per month
CREATE VIEW v_monthly_billing
WITH (security_invoker = true) AS
SELECT
    (billing_month || '-01')::date              AS period_start,
    bt.agent_id,
    COUNT(*)                                     AS billing_count,
    SUM(bt.gci)                                  AS gci
FROM billing_transactions bt
WHERE bt.agent_id IS NOT NULL
GROUP BY 1, 2;


-- ══ v_monthly_acc_metrics ══
-- Accountability self-reports aggregated per agent per month
CREATE VIEW v_monthly_acc_metrics
WITH (security_invoker = true) AS
SELECT
    date_trunc('month', ar.report_date)::date   AS period_start,
    ar.agent_id,
    SUM(ar.listings)                             AS acc_listings,
    SUM(ar.exclusive_mandate)                    AS acc_exclusives,
    SUM(ar.showings_sale + ar.showings_rent)     AS acc_showings,
    SUM(ar.signed_offer)                         AS acc_offers,
    SUM(ar.closing_sale + ar.closing_rent)       AS acc_closings,
    SUM(
        COALESCE(ar.transactions_sale_hi, 0)
      + COALESCE(ar.transactions_sale_lo, 0)
      + COALESCE(ar.transactions_rent_hi, 0)
      + COALESCE(ar.transactions_rent_lo, 0)
    )                                            AS acc_transactions
FROM accountability_reports ar
GROUP BY 1, 2;


-- ══ v_combined_metrics ══
-- CRM + ACC side by side, per agent per month, with team linkage
CREATE VIEW v_combined_metrics
WITH (security_invoker = true) AS
SELECT
    COALESCE(c.period_start, a.period_start)    AS period_start,
    COALESCE(c.agent_id, a.agent_id)            AS agent_id,
    ag.canonical_name,
    ag.office,
    ag.is_team,
    -- Team linkage
    tm.team_id,
    t.team_name,
    -- CRM metrics
    COALESCE(c.registrations, 0)                AS crm_registrations,
    COALESCE(ex.exclusives, 0)                  AS crm_exclusives,
    COALESCE(ex.exclusives_residential, 0)      AS crm_exclusives_residential,
    COALESCE(pub.published, 0)                  AS crm_published,
    COALESCE(sh.showings, 0)                    AS crm_showings,
    COALESCE(c.withdrawals, 0)                  AS crm_withdrawals,
    COALESCE(c.offers, 0)                       AS crm_offers,
    COALESCE(cl.closings, 0)                    AS crm_closings,
    COALESCE(bi.billing_count, 0)               AS crm_billing,
    COALESCE(bi.gci, 0)                         AS gci,
    -- ACC metrics
    COALESCE(a.acc_listings, 0)                 AS acc_registrations,
    COALESCE(a.acc_exclusives, 0)               AS acc_exclusives,
    COALESCE(a.acc_showings, 0)                 AS acc_showings,
    COALESCE(a.acc_offers, 0)                   AS acc_offers,
    COALESCE(a.acc_closings, 0)                 AS acc_closings,
    COALESCE(a.acc_transactions, 0)             AS acc_billing
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


-- ══ v_funnel_by_type ══
-- Pipeline conversion per property subcategory per month
CREATE VIEW v_funnel_by_type
WITH (security_invoker = true) AS
WITH reg AS (
    SELECT date_trunc('month', sc.change_date)::date AS period_start,
           p.subcategory, COUNT(*) AS cnt
    FROM status_changes sc
    JOIN properties p ON sc.property_id = p.property_id
    WHERE sc.event_type = 'activation' AND p.subcategory IS NOT NULL
    GROUP BY 1, 2
),
excl AS (
    SELECT date_trunc('month', e.sign_date)::date AS period_start,
           p.subcategory, COUNT(*) AS cnt
    FROM exclusives e
    JOIN properties p ON e.property_id = p.property_id
    WHERE e.sign_date IS NOT NULL AND p.subcategory IS NOT NULL
    GROUP BY 1, 2
),
pub AS (
    SELECT date_trunc('month', p.first_pub_date)::date AS period_start,
           p.subcategory, COUNT(*) AS cnt
    FROM properties p
    WHERE p.first_pub_date IS NOT NULL AND p.subcategory IS NOT NULL
    GROUP BY 1, 2
),
shw AS (
    SELECT date_trunc('month', y.showing_date)::date AS period_start,
           p.subcategory, COUNT(*) AS cnt
    FROM ypodikseis y
    JOIN properties p ON y.property_id = p.property_id
    WHERE y.showing_date IS NOT NULL AND p.subcategory IS NOT NULL
    GROUP BY 1, 2
),
cls AS (
    SELECT date_trunc('month', c.closing_date)::date AS period_start,
           p.subcategory, COUNT(*) AS cnt
    FROM closings c
    JOIN properties p ON c.property_id = p.property_id
    WHERE c.closing_date IS NOT NULL AND p.subcategory IS NOT NULL
    GROUP BY 1, 2
),
all_periods AS (
    SELECT DISTINCT period_start, subcategory FROM (
        SELECT period_start, subcategory FROM reg
        UNION SELECT period_start, subcategory FROM excl
        UNION SELECT period_start, subcategory FROM pub
        UNION SELECT period_start, subcategory FROM shw
        UNION SELECT period_start, subcategory FROM cls
    ) u
)
SELECT
    ap.period_start,
    ap.subcategory,
    COALESCE(r.cnt, 0)  AS registrations,
    COALESCE(e.cnt, 0)  AS exclusives,
    COALESCE(p.cnt, 0)  AS published,
    COALESCE(s.cnt, 0)  AS showings,
    COALESCE(c.cnt, 0)  AS closings
FROM all_periods ap
LEFT JOIN reg  r ON ap.period_start = r.period_start AND ap.subcategory = r.subcategory
LEFT JOIN excl e ON ap.period_start = e.period_start AND ap.subcategory = e.subcategory
LEFT JOIN pub  p ON ap.period_start = p.period_start AND ap.subcategory = p.subcategory
LEFT JOIN shw  s ON ap.period_start = s.period_start AND ap.subcategory = s.subcategory
LEFT JOIN cls  c ON ap.period_start = c.period_start AND ap.subcategory = c.subcategory;


-- ══ v_withdrawal_reasons ══
-- Parsed deactivation reasons per agent per month
CREATE VIEW v_withdrawal_reasons
WITH (security_invoker = true) AS
SELECT
    date_trunc('month', sc.change_date)::date   AS period_start,
    p.agent_id,
    CASE
        WHEN sc.description ILIKE '%Σε εκκρεμότητα%'          THEN 'Σε εκκρεμότητα'
        WHEN sc.description ILIKE '%Ανενεργό%'                 THEN 'Ανενεργό'
        WHEN sc.description ILIKE '%Άρση εντολής%'             THEN 'Άρση εντολής'
        WHEN sc.description ILIKE '%Έκλεισε από τον πελάτη%'   THEN 'Έκλεισε από τον πελάτη'
        WHEN sc.description ILIKE '%Προβληματικός πωλητής%'    THEN 'Προβληματικός πωλητής'
        WHEN sc.description ILIKE '%Μεγάλη τιμή%'              THEN 'Μεγάλη τιμή'
        WHEN sc.description ILIKE '%Πρόβλημα αρτιότητας%'      THEN 'Πρόβλημα αρτιότητας'
        WHEN sc.description ILIKE '%Προς έλεγχο%'              THEN 'Προς έλεγχο - Χαρτιά'
        WHEN sc.description ILIKE '%Συμβόλαιο σε εξέλιξη%'    THEN 'Συμβόλαιο σε εξέλιξη'
        WHEN sc.description ILIKE '%Έκλεισε από άλλο μεσίτη%' THEN 'Έκλεισε από άλλο μεσίτη'
        WHEN sc.description LIKE '%€%'                         THEN 'Κλείσιμο (deposit)'
        ELSE 'Άλλο'
    END AS reason,
    COUNT(*) AS cnt
FROM status_changes sc
JOIN properties p ON sc.property_id = p.property_id
WHERE sc.event_type = 'deactivation'
  AND sc.change_date IS NOT NULL
GROUP BY 1, 2, 3;


-- ══ v_property_events_timeline ══
-- Unified timeline per property for Property Cards (Page 5)
CREATE VIEW v_property_events_timeline
WITH (security_invoker = true) AS
SELECT property_id, change_date AS event_date, 'activation' AS event_type,
       LEFT(description, 200) AS detail, NULL::numeric AS amount
FROM status_changes WHERE event_type = 'activation'
UNION ALL
SELECT e.property_id, e.sign_date AS event_date, 'exclusive' AS event_type,
       'Αποκλειστική εντολή' AS detail, NULL::numeric AS amount
FROM exclusives e WHERE e.property_id IS NOT NULL AND e.sign_date IS NOT NULL
UNION ALL
SELECT p.property_id, p.first_pub_date::date AS event_date, 'published' AS event_type,
       'Δημοσίευση' AS detail, NULL::numeric AS amount
FROM properties p WHERE p.first_pub_date IS NOT NULL
UNION ALL
SELECT pc.property_id, pc.change_date AS event_date, 'price_change' AS event_type,
       pc.old_price::text || ' → ' || pc.new_price::text AS detail,
       pc.change_eur AS amount
FROM price_changes pc
UNION ALL
SELECT property_id, change_date AS event_date, 'deposit' AS event_type,
       LEFT(description, 200) AS detail, NULL::numeric AS amount
FROM status_changes WHERE event_type = 'deposit'
UNION ALL
SELECT property_id, change_date AS event_date, 'deactivation' AS event_type,
       LEFT(description, 200) AS detail, NULL::numeric AS amount
FROM status_changes WHERE event_type = 'deactivation'
UNION ALL
SELECT c.property_id, c.closing_date AS event_date, 'closing' AS event_type,
       c.closing_type AS detail, c.price AS amount
FROM closings c WHERE c.property_id IS NOT NULL
UNION ALL
SELECT y.property_id, y.showing_date AS event_date, 'showing' AS event_type,
       y.client_name AS detail, NULL::numeric AS amount
FROM ypodikseis y WHERE y.property_id IS NOT NULL;


-- ────────────────────────────────────────────────────────────
-- 4. ROW-LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

-- Helper functions
CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text LANGUAGE sql STABLE AS $$
    SELECT COALESCE(
        auth.jwt() -> 'user_metadata' ->> 'role',
        'anon'
    );
$$;

CREATE OR REPLACE FUNCTION public.user_agent_id()
RETURNS int LANGUAGE sql STABLE AS $$
    SELECT (auth.jwt() -> 'user_metadata' ->> 'agent_id')::int;
$$;

-- Enable RLS on all data tables
ALTER TABLE agents                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members            ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties              ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_changes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_changes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE closings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE exclusives              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ypodikseis              ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_reports  ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_transactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE targets_annual          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log                ENABLE ROW LEVEL SECURITY;

-- ── Active policies: Broker / Admin → see everything ──

CREATE POLICY broker_select ON agents FOR SELECT USING (
    public.user_role() IN ('broker', 'admin')
);
CREATE POLICY broker_select ON teams FOR SELECT USING (
    public.user_role() IN ('broker', 'admin')
);
CREATE POLICY broker_select ON team_members FOR SELECT USING (
    public.user_role() IN ('broker', 'admin')
);
CREATE POLICY broker_select ON properties FOR SELECT USING (
    public.user_role() IN ('broker', 'admin')
);
CREATE POLICY broker_select ON status_changes FOR SELECT USING (
    public.user_role() IN ('broker', 'admin')
);
CREATE POLICY broker_select ON price_changes FOR SELECT USING (
    public.user_role() IN ('broker', 'admin')
);
CREATE POLICY broker_select ON closings FOR SELECT USING (
    public.user_role() IN ('broker', 'admin')
);
CREATE POLICY broker_select ON exclusives FOR SELECT USING (
    public.user_role() IN ('broker', 'admin')
);
CREATE POLICY broker_select ON ypodikseis FOR SELECT USING (
    public.user_role() IN ('broker', 'admin')
);
CREATE POLICY broker_select ON accountability_reports FOR SELECT USING (
    public.user_role() IN ('broker', 'admin')
);
CREATE POLICY broker_select ON billing_transactions FOR SELECT USING (
    public.user_role() IN ('broker', 'admin')
);
CREATE POLICY broker_select ON targets_annual FOR SELECT USING (
    public.user_role() IN ('broker', 'admin')
);
CREATE POLICY broker_select ON sync_log FOR SELECT USING (
    public.user_role() IN ('broker', 'admin')
);

-- ── Service role bypass for sync script ──
-- The sync script uses the service_role key, which bypasses RLS automatically.
-- No extra policy needed for writes.

-- ── Future policies (Cycle 7): Team Leader & Agent ──
-- Uncomment when implementing role expansion.

/*
-- Team Leader: sees own team members
CREATE POLICY team_leader_select ON agents FOR SELECT USING (
    public.user_role() = 'team_leader'
    AND agent_id IN (
        SELECT tm.agent_id FROM team_members tm
        WHERE tm.team_id IN (
            SELECT tm2.team_id FROM team_members tm2
            WHERE tm2.agent_id = public.user_agent_id()
        )
    )
);

-- Agent: sees only self
CREATE POLICY agent_select ON agents FOR SELECT USING (
    public.user_role() = 'agent'
    AND agent_id = public.user_agent_id()
);

-- Properties: team_leader sees team properties
CREATE POLICY team_leader_select ON properties FOR SELECT USING (
    public.user_role() = 'team_leader'
    AND (agent_id IS NULL OR agent_id IN (
        SELECT tm.agent_id FROM team_members tm
        WHERE tm.team_id IN (
            SELECT tm2.team_id FROM team_members tm2
            WHERE tm2.agent_id = public.user_agent_id()
        )
    ))
);

-- Properties: agent sees own + unassigned
CREATE POLICY agent_select ON properties FOR SELECT USING (
    public.user_role() = 'agent'
    AND (agent_id IS NULL OR agent_id = public.user_agent_id())
);

-- status_changes: filtered via property → agent
CREATE POLICY team_leader_select ON status_changes FOR SELECT USING (
    public.user_role() = 'team_leader'
    AND EXISTS (
        SELECT 1 FROM properties p
        WHERE p.property_id = status_changes.property_id
        AND (p.agent_id IS NULL OR p.agent_id IN (
            SELECT tm.agent_id FROM team_members tm
            WHERE tm.team_id IN (
                SELECT tm2.team_id FROM team_members tm2
                WHERE tm2.agent_id = public.user_agent_id()
            )
        ))
    )
);

CREATE POLICY agent_select ON status_changes FOR SELECT USING (
    public.user_role() = 'agent'
    AND EXISTS (
        SELECT 1 FROM properties p
        WHERE p.property_id = status_changes.property_id
        AND (p.agent_id IS NULL OR p.agent_id = public.user_agent_id())
    )
);

-- Same pattern applies to: price_changes, closings, exclusives,
-- ypodikseis, accountability_reports, billing_transactions, targets_annual
*/
