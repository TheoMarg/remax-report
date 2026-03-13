-- ============================================================
-- Migration: Add sale/rent breakdown to ALL KPI sub-views
-- and expose them in v_combined_metrics.
-- Sub-views updated: v_monthly_offers, v_monthly_closings,
-- v_monthly_billing (registrations/exclusives/published/showings
-- were already updated previously).
-- ============================================================

-- 1. Drop dependent views
DROP VIEW IF EXISTS v_combined_metrics;
DROP VIEW IF EXISTS v_monthly_gci;

-- 2. Recreate v_monthly_offers with sale/rent
DROP VIEW IF EXISTS v_monthly_offers;
CREATE VIEW v_monthly_offers
WITH (security_invoker = true) AS
SELECT
    date_trunc('month', o.offer_date)::date AS period_start,
    o.agent_id,
    COUNT(*) AS offers,
    COUNT(*) FILTER (WHERE p.sale_rent = 'Πώληση') AS offers_sale,
    COUNT(*) FILTER (WHERE p.sale_rent = 'Ενοικίαση') AS offers_rent
FROM offers o
LEFT JOIN properties p ON o.property_id = p.property_id
WHERE o.offer_date IS NOT NULL AND o.agent_id IS NOT NULL
GROUP BY 1, 2;

-- 3. Recreate v_monthly_closings with sale/rent
DROP VIEW IF EXISTS v_monthly_closings;
CREATE VIEW v_monthly_closings
WITH (security_invoker = true) AS
SELECT
    date_trunc('month', sc.change_date)::date AS period_start,
    p.agent_id,
    COUNT(DISTINCT sc.property_id) AS closings,
    COUNT(DISTINCT sc.property_id) FILTER (WHERE p.sale_rent = 'Πώληση') AS closings_sale,
    COUNT(DISTINCT sc.property_id) FILTER (WHERE p.sale_rent = 'Ενοικίαση') AS closings_rent
FROM status_changes sc
JOIN properties p ON sc.property_id = p.property_id
WHERE p.agent_id IS NOT NULL
  AND sc.change_date IS NOT NULL
  AND sc.description LIKE '%Έκλεισε από εμάς%'
GROUP BY 1, 2;

-- 4. Recreate v_monthly_billing with sale/rent
DROP VIEW IF EXISTS v_monthly_billing;
CREATE VIEW v_monthly_billing
WITH (security_invoker = true) AS
SELECT
    (billing_month || '-01')::date AS period_start,
    bt.agent_id,
    COUNT(*) AS billing_count,
    SUM(bt.gci) AS gci,
    COUNT(*) FILTER (WHERE NOT bt.is_rental) AS billing_sale,
    COUNT(*) FILTER (WHERE bt.is_rental) AS billing_rent
FROM billing_transactions bt
WHERE bt.agent_id IS NOT NULL
GROUP BY 1, 2;

-- 5. Recreate v_monthly_gci (depends on v_monthly_billing)
CREATE VIEW v_monthly_gci
WITH (security_invoker = true) AS
SELECT period_start, agent_id, gci
FROM v_monthly_billing
UNION ALL
SELECT
    make_date(gm.year, gm.month, 1) AS period_start,
    gm.agent_id,
    gm.gci
FROM gci_monthly gm
WHERE gm.agent_id IS NOT NULL
  AND gm.gci > 0
  AND NOT EXISTS (
      SELECT 1 FROM billing_transactions bt
      WHERE bt.agent_id = gm.agent_id
        AND bt.billing_month = to_char(make_date(gm.year, gm.month, 1), 'YYYY-MM')
  )
UNION ALL
SELECT
    make_date(dh.year, dh.month, 1) AS period_start,
    dh.agent_id,
    dh.gci_actual AS gci
FROM dashboard_history dh
WHERE dh.agent_id IS NOT NULL
  AND dh.gci_actual IS NOT NULL
  AND dh.gci_actual > 0
  AND NOT EXISTS (
      SELECT 1 FROM billing_transactions bt
      WHERE bt.agent_id = dh.agent_id
        AND bt.billing_month = to_char(make_date(dh.year, dh.month, 1), 'YYYY-MM')
  )
  AND NOT EXISTS (
      SELECT 1 FROM gci_monthly gm
      WHERE gm.agent_id = dh.agent_id
        AND gm.year = dh.year
        AND gm.month = dh.month
        AND gm.gci > 0
  );

-- 6. Recreate v_combined_metrics with ALL sale/rent columns
CREATE VIEW v_combined_metrics
WITH (security_invoker = true) AS
WITH spine AS (
    SELECT period_start, agent_id FROM v_monthly_crm_metrics
    UNION
    SELECT period_start, agent_id FROM v_monthly_acc_metrics
    UNION
    SELECT period_start, agent_id FROM v_monthly_registrations
    UNION
    SELECT period_start, agent_id FROM v_monthly_exclusives
    UNION
    SELECT period_start, agent_id FROM v_monthly_published
    UNION
    SELECT period_start, agent_id FROM v_monthly_showings
    UNION
    SELECT period_start, agent_id FROM v_monthly_offers
    UNION
    SELECT period_start, agent_id FROM v_monthly_closings
    UNION
    SELECT period_start, agent_id FROM v_monthly_billing
    UNION
    SELECT period_start, agent_id FROM v_monthly_gci
)
SELECT
    s.period_start,
    s.agent_id,
    ag.canonical_name,
    ag.office,
    ag.is_team,
    tm.team_id,
    t.team_name,
    COALESCE(reg.registrations, 0)            AS crm_registrations,
    COALESCE(reg.registrations_sale, 0)        AS crm_registrations_sale,
    COALESCE(reg.registrations_rent, 0)        AS crm_registrations_rent,
    COALESCE(ex.exclusives, 0)                 AS crm_exclusives,
    COALESCE(ex.exclusives_residential, 0)     AS crm_exclusives_residential,
    COALESCE(ex.exclusives_sale, 0)            AS crm_exclusives_sale,
    COALESCE(ex.exclusives_rent, 0)            AS crm_exclusives_rent,
    COALESCE(pub.published, 0)                 AS crm_published,
    COALESCE(pub.published_sale, 0)            AS crm_published_sale,
    COALESCE(pub.published_rent, 0)            AS crm_published_rent,
    COALESCE(sh.showings, 0)                   AS crm_showings,
    COALESCE(sh.showings_sale, 0)              AS crm_showings_sale,
    COALESCE(sh.showings_rent, 0)              AS crm_showings_rent,
    COALESCE(off.offers, 0)                    AS crm_offers,
    COALESCE(off.offers_sale, 0)               AS crm_offers_sale,
    COALESCE(off.offers_rent, 0)               AS crm_offers_rent,
    COALESCE(c.withdrawals, 0)                 AS crm_withdrawals,
    COALESCE(cl.closings, 0)                   AS crm_closings,
    COALESCE(cl.closings_sale, 0)              AS crm_closings_sale,
    COALESCE(cl.closings_rent, 0)              AS crm_closings_rent,
    COALESCE(bi.billing_count, 0)              AS crm_billing,
    COALESCE(bi.billing_sale, 0)               AS crm_billing_sale,
    COALESCE(bi.billing_rent, 0)               AS crm_billing_rent,
    COALESCE(gci_all.gci, 0)                   AS gci,
    COALESCE(a.acc_listings, 0)                AS acc_registrations,
    COALESCE(a.acc_exclusives, 0)              AS acc_exclusives,
    COALESCE(a.acc_showings, 0)                AS acc_showings,
    COALESCE(a.acc_offers, 0)                  AS acc_offers,
    COALESCE(a.acc_closings, 0)                AS acc_closings,
    COALESCE(a.acc_transactions, 0)            AS acc_billing
FROM spine s
LEFT JOIN agents ag ON s.agent_id = ag.agent_id
LEFT JOIN team_members tm ON s.agent_id = tm.agent_id
LEFT JOIN teams t ON tm.team_id = t.team_id
LEFT JOIN v_monthly_crm_metrics c ON s.period_start = c.period_start AND s.agent_id = c.agent_id
LEFT JOIN v_monthly_acc_metrics a ON s.period_start = a.period_start AND s.agent_id = a.agent_id
LEFT JOIN v_monthly_registrations reg ON s.period_start = reg.period_start AND s.agent_id = reg.agent_id
LEFT JOIN v_monthly_exclusives ex ON s.period_start = ex.period_start AND s.agent_id = ex.agent_id
LEFT JOIN v_monthly_published pub ON s.period_start = pub.period_start AND s.agent_id = pub.agent_id
LEFT JOIN v_monthly_showings sh ON s.period_start = sh.period_start AND s.agent_id = sh.agent_id
LEFT JOIN v_monthly_offers off ON s.period_start = off.period_start AND s.agent_id = off.agent_id
LEFT JOIN v_monthly_closings cl ON s.period_start = cl.period_start AND s.agent_id = cl.agent_id
LEFT JOIN v_monthly_billing bi ON s.period_start = bi.period_start AND s.agent_id = bi.agent_id
LEFT JOIN (
    SELECT period_start, agent_id, SUM(gci) AS gci
    FROM v_monthly_gci
    GROUP BY period_start, agent_id
) gci_all ON s.period_start = gci_all.period_start AND s.agent_id = gci_all.agent_id;

-- 7. Re-grant permissions
GRANT SELECT ON v_monthly_offers TO anon, authenticated, service_role;
GRANT SELECT ON v_monthly_closings TO anon, authenticated, service_role;
GRANT SELECT ON v_monthly_billing TO anon, authenticated, service_role;
GRANT SELECT ON v_monthly_gci TO anon, authenticated, service_role;
GRANT SELECT ON v_combined_metrics TO anon, authenticated, service_role;
