-- ============================================================
-- RE/MAX Report Hub v2 — Migration 001
-- 9 new views + 3 new tables + RLS + grants
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- VIEW 1: v_property_journey — One row per property, all milestones
-- ══════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS v_stuck_alerts CASCADE;
DROP VIEW IF EXISTS v_property_journey CASCADE;

CREATE VIEW v_property_journey
WITH (security_invoker = true) AS
SELECT
    p.property_id,
    p.property_code,
    p.agent_id,
    p.category,
    p.subcategory,
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

    -- Milestone dates
    p.registration_date                              AS dt_registration,
    exc.sign_date                                    AS dt_exclusive,
    p.first_pub_date::date                           AS dt_published,
    first_show.first_showing_date                    AS dt_first_showing,
    dep.deposit_date                                 AS dt_offer,
    cl.closing_date                                  AS dt_closing,

    -- Milestone flags
    (p.registration_date IS NOT NULL)                AS has_registration,
    (exc.sign_date IS NOT NULL)                      AS has_exclusive,
    (p.first_pub_date IS NOT NULL)                   AS has_published,
    (first_show.first_showing_date IS NOT NULL)      AS has_showing,
    (dep.deposit_date IS NOT NULL)                   AS has_offer,
    (cl.closing_date IS NOT NULL)                    AS has_closing,

    -- Days between stages
    exc.sign_date - p.registration_date              AS days_reg_to_excl,
    dep.deposit_date - exc.sign_date                 AS days_excl_to_offer,
    cl.closing_date - dep.deposit_date               AS days_offer_to_closing,
    cl.closing_date - exc.sign_date                  AS days_excl_to_closing,
    cl.closing_date - p.registration_date            AS days_total_journey,

    -- Showing enrichment
    COALESCE(show_stats.total_showings, 0)           AS total_showings,
    COALESCE(show_stats.unique_clients, 0)           AS unique_clients,

    -- Price quality
    cl.closing_price,
    CASE
      WHEN p.price > 0 AND cl.closing_price > 0
      THEN ROUND(((cl.closing_price - p.price) / p.price * 100)::numeric, 1)
    END                                              AS price_delta_pct,
    cl.gci,

    -- Price reductions
    COALESCE(pc_stats.reduction_count, 0)            AS price_reduction_count

FROM properties p
LEFT JOIN agents ag ON p.agent_id = ag.agent_id

LEFT JOIN LATERAL (
    SELECT e.sign_date FROM exclusives e
    WHERE e.property_id = p.property_id
    ORDER BY e.sign_date ASC LIMIT 1
) exc ON true

LEFT JOIN LATERAL (
    SELECT MIN(y.showing_date) AS first_showing_date
    FROM ypodikseis y
    WHERE y.property_id = p.property_id
) first_show ON true

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


-- ══════════════════════════════════════════════════════════════
-- VIEW 2: v_active_exclusives
-- ══════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS v_active_exclusives CASCADE;

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


-- ══════════════════════════════════════════════════════════════
-- VIEW 3: v_portfolio_quality
-- ══════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS v_portfolio_quality CASCADE;

CREATE VIEW v_portfolio_quality
WITH (security_invoker = true) AS
WITH active_props AS (
    SELECT p.*,
           (e.property_id IS NOT NULL) AS is_exclusive_now,
           CURRENT_DATE - COALESCE(p.registration_date, p.first_seen_at::date) AS calc_days_on_market
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
    ROUND(AVG(ap.calc_days_on_market)::numeric, 0) AS avg_days_on_market,
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


-- ══════════════════════════════════════════════════════════════
-- VIEW 4: v_agent_activity
-- ══════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS v_agent_activity CASCADE;

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


-- ══════════════════════════════════════════════════════════════
-- VIEW 5: v_pipeline_value
-- ══════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS v_pipeline_value CASCADE;

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


-- ══════════════════════════════════════════════════════════════
-- VIEW 6: v_pricing_benchmark
-- ══════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS v_pricing_benchmark CASCADE;

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


-- ══════════════════════════════════════════════════════════════
-- VIEW 7: v_property_pricing
-- ══════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS v_property_pricing CASCADE;

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


-- ══════════════════════════════════════════════════════════════
-- VIEW 8: v_closing_pricing
-- ══════════════════════════════════════════════════════════════
DROP VIEW IF EXISTS v_closing_pricing CASCADE;

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


-- ══════════════════════════════════════════════════════════════
-- VIEW 9: v_stuck_alerts (depends on v_property_journey)
-- ══════════════════════════════════════════════════════════════

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


-- ══════════════════════════════════════════════════════════════
-- TABLE 1: kpi_weights
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kpi_weights (
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
DROP POLICY IF EXISTS kpi_weights_select ON kpi_weights;
CREATE POLICY kpi_weights_select ON kpi_weights FOR SELECT USING (true);
DROP POLICY IF EXISTS kpi_weights_update ON kpi_weights;
CREATE POLICY kpi_weights_update ON kpi_weights FOR UPDATE
  USING ((current_setting('request.jwt.claims', true)::json ->> 'role') = 'ops_mgr');


-- ══════════════════════════════════════════════════════════════
-- TABLE 2: pqs_weights
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pqs_weights (
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
DROP POLICY IF EXISTS pqs_weights_select ON pqs_weights;
CREATE POLICY pqs_weights_select ON pqs_weights FOR SELECT USING (true);
DROP POLICY IF EXISTS pqs_weights_update ON pqs_weights;
CREATE POLICY pqs_weights_update ON pqs_weights FOR UPDATE
  USING ((current_setting('request.jwt.claims', true)::json ->> 'role') = 'ops_mgr');


-- ══════════════════════════════════════════════════════════════
-- TABLE 3: agent_targets
-- ══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS agent_targets (
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
DROP POLICY IF EXISTS targets_select ON agent_targets;
CREATE POLICY targets_select ON agent_targets FOR SELECT USING (true);
DROP POLICY IF EXISTS targets_write ON agent_targets;
CREATE POLICY targets_write ON agent_targets FOR ALL
  USING ((current_setting('request.jwt.claims', true)::json ->> 'role') IN ('ops_mgr', 'broker'));


-- ══════════════════════════════════════════════════════════════
-- GRANTS for all new objects
-- ══════════════════════════════════════════════════════════════
GRANT SELECT ON v_property_journey, v_active_exclusives, v_portfolio_quality,
  v_agent_activity, v_pipeline_value, v_pricing_benchmark,
  v_property_pricing, v_closing_pricing, v_stuck_alerts
  TO anon, authenticated, service_role;

GRANT SELECT ON kpi_weights, pqs_weights, agent_targets TO anon, authenticated, service_role;
GRANT ALL ON kpi_weights, pqs_weights, agent_targets TO authenticated;
