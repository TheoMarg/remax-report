-- ============================================================
-- Migration 004: Add gci_monthly table + update v_monthly_gci
-- Monthly GCI per agent from GrowthCFO "ΤΖΙΡΟΣ ΑΝΑ ΣΥΝΕΡΓΑΤΗ"
-- ============================================================

-- 1. Create gci_monthly table
CREATE TABLE IF NOT EXISTS gci_monthly (
    id        SERIAL PRIMARY KEY,
    agent_id  INT REFERENCES agents(agent_id),
    year      INT NOT NULL,
    month     INT NOT NULL,
    gci       NUMERIC(12,2) NOT NULL,
    source    TEXT NOT NULL DEFAULT 'gsheet_growthcfo',
    UNIQUE (agent_id, year, month, source)
);

CREATE INDEX idx_gci_monthly_agent ON gci_monthly(agent_id);
CREATE INDEX idx_gci_monthly_period ON gci_monthly(year, month);

ALTER TABLE gci_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY broker_select ON gci_monthly FOR SELECT USING (
    public.user_role() IN ('broker', 'admin')
);

-- 2. Update v_monthly_gci to include gci_monthly
--    Priority: billing_transactions > gci_monthly > dashboard_history
DROP VIEW IF EXISTS v_combined_metrics CASCADE;
DROP VIEW IF EXISTS v_monthly_gci CASCADE;

CREATE VIEW v_monthly_gci
WITH (security_invoker = true) AS
-- Layer 1: billing_transactions (highest priority - individual transactions)
SELECT period_start, agent_id, gci
FROM v_monthly_billing
UNION ALL
-- Layer 2: gci_monthly (GrowthCFO actual revenue, when no billing exists)
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
-- Layer 3: dashboard_history (lowest priority - when neither billing nor gci_monthly exists)
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
  )
  AND NOT EXISTS (
      SELECT 1 FROM gci_monthly gm
      WHERE gm.agent_id = dh.agent_id
        AND gm.year = dh.year
        AND gm.month = dh.month
        AND gm.gci > 0
  );

-- 3. Recreate v_combined_metrics (was dropped due to CASCADE)
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

-- 4. Grant permissions
GRANT SELECT ON gci_monthly TO anon, authenticated, service_role;
GRANT ALL ON gci_monthly TO service_role;
GRANT USAGE ON SEQUENCE gci_monthly_id_seq TO service_role;
GRANT SELECT ON v_monthly_gci TO anon, authenticated, service_role;
GRANT SELECT ON v_combined_metrics TO anon, authenticated, service_role;
GRANT SELECT ON v_monthly_registrations TO anon, authenticated, service_role;
