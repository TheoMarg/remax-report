-- ============================================================
-- Migration 002: Add registration_date to properties
-- Uses "Καταχωρήθηκε" event date instead of first_seen_at
-- ============================================================

-- 1. Add column
ALTER TABLE properties ADD COLUMN IF NOT EXISTS registration_date DATE;

-- 2. Recreate v_monthly_registrations to use registration_date
DROP VIEW IF EXISTS v_combined_metrics CASCADE;
DROP VIEW IF EXISTS v_monthly_registrations CASCADE;

CREATE VIEW v_monthly_registrations
WITH (security_invoker = true) AS
SELECT
    date_trunc('month', p.registration_date)::date  AS period_start,
    p.agent_id,
    COUNT(*)                                         AS registrations
FROM properties p
WHERE p.agent_id IS NOT NULL
  AND p.registration_date IS NOT NULL
GROUP BY 1, 2;

-- 3. Recreate v_combined_metrics (depends on v_monthly_registrations)
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
    SELECT period_start, agent_id FROM v_monthly_closings
    UNION
    SELECT period_start, agent_id FROM v_monthly_billing
)
SELECT
    s.period_start,
    s.agent_id,
    ag.canonical_name,
    ag.office,
    ag.is_team,
    tm.team_id,
    t.team_name,
    COALESCE(reg.registrations, 0)              AS crm_registrations,
    COALESCE(ex.exclusives, 0)                  AS crm_exclusives,
    COALESCE(ex.exclusives_residential, 0)      AS crm_exclusives_residential,
    COALESCE(pub.published, 0)                  AS crm_published,
    COALESCE(sh.showings, 0)                    AS crm_showings,
    COALESCE(c.withdrawals, 0)                  AS crm_withdrawals,
    COALESCE(c.offers, 0)                       AS crm_offers,
    COALESCE(cl.closings, 0)                    AS crm_closings,
    COALESCE(bi.billing_count, 0)               AS crm_billing,
    COALESCE(bi.gci, 0)                         AS gci,
    COALESCE(a.acc_listings, 0)                 AS acc_registrations,
    COALESCE(a.acc_exclusives, 0)               AS acc_exclusives,
    COALESCE(a.acc_showings, 0)                 AS acc_showings,
    COALESCE(a.acc_offers, 0)                   AS acc_offers,
    COALESCE(a.acc_closings, 0)                 AS acc_closings,
    COALESCE(a.acc_transactions, 0)             AS acc_billing
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
LEFT JOIN v_monthly_closings cl ON s.period_start = cl.period_start AND s.agent_id = cl.agent_id
LEFT JOIN v_monthly_billing bi ON s.period_start = bi.period_start AND s.agent_id = bi.agent_id;

-- 4. Re-grant permissions (CASCADE drops lose grants)
GRANT SELECT ON v_monthly_registrations TO anon, authenticated, service_role;
GRANT SELECT ON v_combined_metrics TO anon, authenticated, service_role;
