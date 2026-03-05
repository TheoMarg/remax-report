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
cur = conn.cursor()

# All Feb 2026 exclusives with property details
print("All Feb 2026 gsheet exclusives with property details:")
cur.execute("""
    SELECT e.agent_id, e.property_code, e.property_id,
           p.category, p.subcategory, p.sale_rent
    FROM exclusives e
    LEFT JOIN properties p ON e.property_id = p.property_id
    WHERE e.sign_date >= '2026-02-01' AND e.sign_date < '2026-03-01'
      AND e.source LIKE 'gsheet%%'
    ORDER BY e.agent_id
""")
for r in cur.fetchall():
    cat = r[3] or 'NULL'
    sub = r[4] or 'NULL'
    sr = r[5] or 'NULL'
    is_res = sub in ('Διαμέρισμα','Μονοκατοικία','Μεζονέτα','Γκαρσονιέρα',
                     'Παραθεριστική Κατοικία','Βίλα','Συγκρότημα Κατοικιών')
    marker = " ← ΟΙΚΙΣΤ.ΠΩΛΗΣΗΣ" if (is_res and sr == 'Πώληση') else ""
    print(f"  agent={r[0]:>3} code={r[1]:15s} cat={cat:25s} sub={sub:25s} sr={sr:12s}{marker}")

# crm_exclusives_residential in v_combined_metrics
print(f"\ncrm_exclusives_residential in v_combined_metrics (Feb 2026):")
cur.execute("""
    SELECT agent_id, crm_exclusives_residential
    FROM v_combined_metrics
    WHERE period_start = '2026-02-01' AND crm_exclusives_residential > 0
    ORDER BY crm_exclusives_residential DESC
""")
total = 0
for r in cur.fetchall():
    print(f"  agent={r[0]:>3}: {r[1]}")
    total += r[1]
print(f"  TOTAL: {total}")

conn.close()
