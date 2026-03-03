-- ============================================================
-- Migration 003: Add dashboard_history table + unified GCI view
-- Historical per-agent monthly GCI from Excel dashboards / GrowthCFO
-- ============================================================

-- 1. Create dashboard_history table
CREATE TABLE IF NOT EXISTS dashboard_history (
    id                SERIAL PRIMARY KEY,
    agent_id          INT REFERENCES agents(agent_id),
    year              INT NOT NULL,
    month             INT NOT NULL,
    gci_plan          NUMERIC(12,2),
    gci_actual        NUMERIC(12,2),
    source            TEXT NOT NULL DEFAULT 'excel_dashboard',
    exclusives_plan   INT,
    exclusives_actual INT,
    UNIQUE (agent_id, year, month, source)
);

CREATE INDEX idx_dh_agent ON dashboard_history(agent_id);
CREATE INDEX idx_dh_period ON dashboard_history(year, month);

ALTER TABLE dashboard_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY broker_select ON dashboard_history FOR SELECT USING (
    public.user_role() IN ('broker', 'admin')
);

-- 2. Create v_monthly_gci: unifies billing_transactions + dashboard_history
--    Priority: billing_transactions wins when both exist for same agent/month
DROP VIEW IF EXISTS v_combined_metrics CASCADE;
DROP VIEW IF EXISTS v_monthly_billing CASCADE;

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

-- v_monthly_gci: billing_transactions UNION dashboard_history (billing wins)
CREATE VIEW v_monthly_gci
WITH (security_invoker = true) AS
SELECT period_start, agent_id, gci
FROM v_monthly_billing
UNION ALL
SELECT
    make_date(dh.year, dh.month, 1) AS period_start,
    dh.agent_id,
    dh.gci_actual                   AS gci
FROM dashboard_history dh
WHERE dh.agent_id IS NOT NULL
  AND dh.gci_actual IS NOT NULL
  AND dh.gci_actual > 0
  AND NOT EXISTS (
      SELECT 1 FROM billing_transactions bt
      WHERE bt.agent_id = dh.agent_id
        AND bt.billing_month = to_char(make_date(dh.year, dh.month, 1), 'YYYY-MM')
  );

-- 3. Recreate v_combined_metrics with v_monthly_gci for GCI
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
    COALESCE(reg.registrations, 0)              AS crm_registrations,
    COALESCE(ex.exclusives, 0)                  AS crm_exclusives,
    COALESCE(ex.exclusives_residential, 0)      AS crm_exclusives_residential,
    COALESCE(pub.published, 0)                  AS crm_published,
    COALESCE(sh.showings, 0)                    AS crm_showings,
    COALESCE(c.withdrawals, 0)                  AS crm_withdrawals,
    COALESCE(c.offers, 0)                       AS crm_offers,
    COALESCE(cl.closings, 0)                    AS crm_closings,
    COALESCE(bi.billing_count, 0)               AS crm_billing,
    COALESCE(gci_all.gci, 0)                    AS gci,
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
LEFT JOIN v_monthly_billing bi ON s.period_start = bi.period_start AND s.agent_id = bi.agent_id
LEFT JOIN (
    SELECT period_start, agent_id, SUM(gci) AS gci
    FROM v_monthly_gci
    GROUP BY period_start, agent_id
) gci_all ON s.period_start = gci_all.period_start AND s.agent_id = gci_all.agent_id;

-- 4. Re-grant permissions
GRANT SELECT ON dashboard_history TO anon, authenticated, service_role;
GRANT ALL ON dashboard_history TO service_role;
GRANT USAGE ON SEQUENCE dashboard_history_id_seq TO service_role;
GRANT SELECT ON v_monthly_billing TO anon, authenticated, service_role;
GRANT SELECT ON v_monthly_gci TO anon, authenticated, service_role;
GRANT SELECT ON v_combined_metrics TO anon, authenticated, service_role;
GRANT SELECT ON v_monthly_registrations TO anon, authenticated, service_role;
