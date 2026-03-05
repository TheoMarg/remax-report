import psycopg2, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conn = psycopg2.connect(
    host="aws-1-eu-central-1.pooler.supabase.com",
    port=6543,
    dbname="postgres",
    user="postgres.bpumfzwrmmolsilbjqjl",
    password="C-j-932eM-j_cJ7",
    sslmode="require",
)
conn.autocommit = True
cur = conn.cursor()

# 1. Drop dependent view first
cur.execute("DROP VIEW IF EXISTS v_combined_metrics CASCADE")
cur.execute("DROP VIEW IF EXISTS v_monthly_published CASCADE")

# 2. Recreate v_monthly_published with sale/rent
cur.execute("""
    CREATE VIEW v_monthly_published AS
    SELECT
        date_trunc('month', event_date)::date AS period_start,
        agent_id,
        COUNT(DISTINCT property_id) AS published,
        COUNT(DISTINCT property_id) FILTER (WHERE sale_rent = 'Πώληση') AS published_sale,
        COUNT(DISTINCT property_id) FILTER (WHERE sale_rent = 'Ενοικίαση') AS published_rent
    FROM portal_publications
    WHERE event_type = 'publish'
    GROUP BY date_trunc('month', event_date)::date, agent_id
""")
print("Recreated v_monthly_published with sale/rent")

# Verify
cur.execute("""
    SELECT SUM(published), SUM(published_sale), SUM(published_rent)
    FROM v_monthly_published WHERE period_start = '2026-02-01'
""")
r = cur.fetchone()
print(f"Feb 2026: total={r[0]}, sale={r[1]}, rent={r[2]}")

# 3. Recreate v_combined_metrics with published_sale/rent
cur.execute("""
    CREATE VIEW v_combined_metrics AS
    WITH spine AS (
        SELECT period_start, agent_id FROM v_monthly_crm_metrics
        UNION SELECT period_start, agent_id FROM v_monthly_acc_metrics
        UNION SELECT period_start, agent_id FROM v_monthly_registrations
        UNION SELECT period_start, agent_id FROM v_monthly_exclusives
        UNION SELECT period_start, agent_id FROM v_monthly_published
        UNION SELECT period_start, agent_id FROM v_monthly_showings
        UNION SELECT period_start, agent_id FROM v_monthly_closings
        UNION SELECT period_start, agent_id FROM v_monthly_billing
        UNION SELECT period_start, agent_id FROM v_monthly_gci
        UNION SELECT period_start, agent_id FROM v_monthly_offers
    )
    SELECT
        s.period_start, s.agent_id,
        ag.canonical_name, ag.office, ag.is_team,
        tm.team_id, t.team_name,
        COALESCE(reg.registrations,0) AS crm_registrations,
        COALESCE(reg.registrations_sale,0) AS crm_registrations_sale,
        COALESCE(reg.registrations_rent,0) AS crm_registrations_rent,
        COALESCE(ex.exclusives,0) AS crm_exclusives,
        COALESCE(ex.exclusives_residential,0) AS crm_exclusives_residential,
        COALESCE(ex.exclusives_sale,0) AS crm_exclusives_sale,
        COALESCE(ex.exclusives_rent,0) AS crm_exclusives_rent,
        COALESCE(pub.published,0) AS crm_published,
        COALESCE(pub.published_sale,0) AS crm_published_sale,
        COALESCE(pub.published_rent,0) AS crm_published_rent,
        COALESCE(sh.showings,0) AS crm_showings,
        COALESCE(c.withdrawals,0) AS crm_withdrawals,
        COALESCE(o.offers,0) AS crm_offers,
        COALESCE(cl.closings,0) AS crm_closings,
        COALESCE(bi.billing_count,0) AS crm_billing,
        COALESCE(gci_all.gci,0) AS gci,
        COALESCE(a.acc_listings,0) AS acc_registrations,
        COALESCE(a.acc_exclusives,0) AS acc_exclusives,
        COALESCE(a.acc_showings,0) AS acc_showings,
        COALESCE(a.acc_offers,0) AS acc_offers,
        COALESCE(a.acc_closings,0) AS acc_closings,
        COALESCE(a.acc_transactions,0) AS acc_billing
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
    LEFT JOIN v_monthly_offers o ON s.period_start = o.period_start AND s.agent_id = o.agent_id
    LEFT JOIN (
        SELECT period_start, agent_id, SUM(gci) AS gci
        FROM v_monthly_gci GROUP BY period_start, agent_id
    ) gci_all ON s.period_start = gci_all.period_start AND s.agent_id = gci_all.agent_id
""")
print("Recreated v_combined_metrics")

# Grants
cur.execute("GRANT SELECT ON v_monthly_published TO anon, authenticated")
cur.execute("GRANT SELECT ON v_combined_metrics TO anon, authenticated")
print("Grants OK")

conn.close()
