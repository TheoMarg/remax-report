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

# Recreate with category = 'Κατοικίες' AND sale_rent = 'Πώληση'
cur.execute("DROP VIEW IF EXISTS v_exclusives_residential_detail CASCADE")
cur.execute("""
    CREATE VIEW v_exclusives_residential_detail AS
    WITH deduped AS (
        SELECT property_code, agent_id, sign_date, property_id
        FROM exclusives
        WHERE agent_id IS NOT NULL AND sign_date IS NOT NULL
          AND source LIKE 'gsheet%%'
        UNION ALL
        SELECT property_code, agent_id, sign_date, property_id
        FROM exclusives
        WHERE agent_id IS NOT NULL AND sign_date IS NOT NULL
          AND source LIKE 'excel%%'
          AND sign_date < '2026-01-15'
          AND property_code NOT IN (SELECT property_code FROM exclusives WHERE source LIKE 'gsheet%%')
    )
    SELECT
        date_trunc('month', e.sign_date)::date AS period_start,
        e.agent_id,
        p.subcategory,
        COUNT(DISTINCT e.property_code) AS cnt
    FROM deduped e
    LEFT JOIN properties p ON e.property_id = p.property_id
    WHERE p.category = 'Κατοικίες'
      AND p.sale_rent = 'Πώληση'
    GROUP BY date_trunc('month', e.sign_date)::date, e.agent_id, p.subcategory
""")
cur.execute("GRANT SELECT ON v_exclusives_residential_detail TO anon, authenticated")
print("Recreated v_exclusives_residential_detail (category='Κατοικίες' AND Πώληση)")

# Verify
cur.execute("""
    SELECT agent_id, subcategory, cnt
    FROM v_exclusives_residential_detail
    WHERE period_start = '2026-02-01'
    ORDER BY agent_id, subcategory
""")
print("\nFeb 2026:")
for r in cur.fetchall():
    print(f"  agent={r[0]:>3}, {r[1]:30s} = {r[2]}")

conn.close()
