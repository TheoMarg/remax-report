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

# Create view for per-agent per-subcategory residential exclusive counts
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
        p.sale_rent,
        COUNT(DISTINCT e.property_code) AS cnt
    FROM deduped e
    LEFT JOIN properties p ON e.property_id = p.property_id
    WHERE p.subcategory IN (
        'Διαμέρισμα','Μονοκατοικία','Μεζονέτα','Γκαρσονιέρα',
        'Παραθεριστική Κατοικία','Βίλα','Συγκρότημα Κατοικιών'
    )
    AND p.sale_rent = 'Πώληση'
    GROUP BY date_trunc('month', e.sign_date)::date, e.agent_id, p.subcategory, p.sale_rent
""")
cur.execute("GRANT SELECT ON v_exclusives_residential_detail TO anon, authenticated")
print("Created v_exclusives_residential_detail")

# Verify Feb 2026
cur.execute("""
    SELECT agent_id, subcategory, cnt
    FROM v_exclusives_residential_detail
    WHERE period_start = '2026-02-01'
    ORDER BY agent_id, subcategory
""")
print("\nFeb 2026 residential sale exclusives per agent per type:")
agent_totals = {}
for r in cur.fetchall():
    print(f"  agent={r[0]:>3}, {r[1]:30s} = {r[2]}")
    agent_totals[r[0]] = agent_totals.get(r[0], 0) + r[2]

print(f"\nPer agent totals:")
for aid, total in sorted(agent_totals.items(), key=lambda x: -x[1]):
    marker = " ✓ 4+" if total >= 4 else ""
    print(f"  agent={aid:>3}: {total}{marker}")

conn.close()
print("\nDone!")
