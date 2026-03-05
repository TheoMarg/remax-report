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

# Schema
cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'exclusives' ORDER BY ordinal_position")
print("Exclusives columns:")
for r in cur.fetchall():
    print(f"  {r[0]:30s} {r[1]}")

# Sample rows
cur.execute("SELECT * FROM exclusives LIMIT 3")
cols = [desc[0] for desc in cur.description]
print(f"\nSample rows:")
for r in cur.fetchall():
    d = dict(zip(cols, r))
    print(f"  {d}")

# Check for sale/rent field
for field in ['sale_rent', 'type', 'category', 'sr', 'int_to', 'property_type']:
    cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = 'exclusives' AND column_name = '{field}'")
    if cur.fetchone():
        print(f"\nFound field: {field}")
        cur.execute(f"SELECT {field}, COUNT(*) FROM exclusives GROUP BY {field}")
        for r in cur.fetchall():
            print(f"  {r[0]}: {r[1]}")

# Check v_monthly_exclusives view
cur.execute("SELECT pg_get_viewdef('v_monthly_exclusives'::regclass, true)")
print(f"\nv_monthly_exclusives view:")
print(cur.fetchone()[0])

# Feb 2026 exclusives
print("\nFeb 2026 exclusives:")
cur.execute("""
    SELECT * FROM exclusives
    WHERE sign_date >= '2026-02-01' AND sign_date < '2026-03-01'
      AND source LIKE 'gsheet%%'
    ORDER BY sign_date
""")
cols = [desc[0] for desc in cur.description]
for r in cur.fetchall():
    d = dict(zip(cols, r))
    # Print key fields
    print(f"  agent={d.get('agent_id')}, sign={d.get('sign_date')}, code={d.get('property_code')}, "
          f"cat={d.get('category','?')}, sr={d.get('sr','?')}, source={d.get('source')}")

conn.close()
