"""
Import missing data into Supabase:
1. Create `portal_publications` table + import from CRM miner
2. Create `offers` table + import from warehouse.sqlite
3. Update v_monthly_published view to use portal events
4. Create v_monthly_offers view
5. Update v_combined_metrics to use correct sources
"""
import sqlite3, psycopg2, sys, io, json
from collections import defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# --- Connect to all databases ---
print("Connecting to databases...")
crm = sqlite3.connect(r"D:\Real Status CRM crawler\data\crm_miner.sqlite")
crm.row_factory = sqlite3.Row
wh = sqlite3.connect(r"D:\Remax Data Warehouse\data\warehouse.sqlite")
wh.row_factory = sqlite3.Row
pg = psycopg2.connect(
    host="aws-1-eu-central-1.pooler.supabase.com",
    port=6543,
    dbname="postgres",
    user="postgres.bpumfzwrmmolsilbjqjl",
    password="C-j-932eM-j_cJ7",
    sslmode="require",
)
pg.autocommit = False
pgcur = pg.cursor()

# ============================================================
# STEP 1: Extract portal publications from CRM miner
# ============================================================
print("\n" + "="*60)
print("STEP 1: Extracting portal publications from CRM miner")
print("="*60)

ccur = crm.cursor()
wcur = wh.cursor()

ccur.execute("""
    SELECT entity_id, payload_json
    FROM entity_snapshots
    WHERE entity_type = 'property'
      AND payload_json LIKE '%portal_publications%'
""")

pub_rows = []
for row in ccur.fetchall():
    entity_id = row[0]
    payload = json.loads(row[1])
    history = payload.get('_history_sidebar', {})
    pubs = history.get('portal_publications', [])
    int_to = payload.get('edit_int_to', '')

    # Get agent_id from warehouse properties
    wcur.execute("SELECT agent_id FROM properties WHERE property_id = ?", (str(entity_id),))
    wrow = wcur.fetchone()
    agent_id = wrow[0] if wrow else None

    for p in pubs:
        desc = str(p.get('description', ''))
        date_str = str(p.get('date', ''))
        action = str(p.get('action', ''))

        # Determine portal name from description
        portal = ''
        desc_lower = desc.lower()
        if 'spitogatos' in desc_lower:
            portal = 'spitogatos'
        elif 'spourgiti' in desc_lower or 'σπουργίτι' in desc_lower:
            portal = 'spourgiti'
        elif 'xe' in desc_lower:
            portal = 'xe'
        elif 'plot' in desc_lower:
            portal = 'plot'
        elif 'remax' in desc_lower:
            portal = 'remax'

        # Determine event type (publish/unpublish)
        event_type = 'unknown'
        if 'αποστολή' in desc_lower:
            event_type = 'publish'
        elif 'αποδημοσίευση' in desc_lower:
            event_type = 'unpublish'

        # Parse date (format: 2026-02-15T10:30:00 or similar)
        pub_date = date_str[:10] if len(date_str) >= 10 else date_str

        if pub_date and agent_id is not None:
            pub_rows.append((
                entity_id,      # property_id
                agent_id,       # agent_id
                pub_date,       # event_date
                event_type,     # event_type
                portal,         # portal_name
                desc,           # description
                int_to or '',   # sale_rent
            ))

print(f"Extracted {len(pub_rows)} portal publication events")
publish_count = sum(1 for r in pub_rows if r[3] == 'publish')
unpublish_count = sum(1 for r in pub_rows if r[3] == 'unpublish')
print(f"  publish: {publish_count}, unpublish: {unpublish_count}")

# ============================================================
# STEP 2: Extract offers from warehouse
# ============================================================
print("\n" + "="*60)
print("STEP 2: Extracting offers from warehouse")
print("="*60)

wcur.execute("SELECT * FROM offers ORDER BY id")
offer_rows = []
for row in wcur.fetchall():
    d = dict(row)
    # Parse DD/MM/YYYY to YYYY-MM-DD
    raw_date = d['offer_date'] or ''
    if '/' in raw_date:
        parts = raw_date.split('/')
        if len(parts) == 3:
            iso_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
        else:
            iso_date = raw_date
    else:
        iso_date = raw_date

    offer_rows.append((
        d['offer_id'],
        d['agent_id'],
        d.get('property_code', ''),
        d.get('property_id', ''),
        d.get('property_price'),
        d.get('offer_amount'),
        d.get('client_name', ''),
        iso_date,           # offer_date in ISO
        d.get('status', ''),
        d.get('source', ''),
    ))

print(f"Extracted {len(offer_rows)} offers from warehouse")

# ============================================================
# STEP 3: Create tables in Supabase
# ============================================================
print("\n" + "="*60)
print("STEP 3: Creating tables in Supabase")
print("="*60)

# Drop and recreate portal_publications
pgcur.execute("DROP TABLE IF EXISTS portal_publications CASCADE")
pgcur.execute("""
    CREATE TABLE portal_publications (
        id SERIAL PRIMARY KEY,
        property_id TEXT NOT NULL,
        agent_id INTEGER NOT NULL,
        event_date DATE NOT NULL,
        event_type TEXT NOT NULL,  -- 'publish' or 'unpublish'
        portal_name TEXT,
        description TEXT,
        sale_rent TEXT             -- 'Πώληση' or 'Ενοικίαση'
    )
""")
print("  Created portal_publications table")

# Drop and recreate offers
pgcur.execute("DROP TABLE IF EXISTS offers CASCADE")
pgcur.execute("""
    CREATE TABLE offers (
        id SERIAL PRIMARY KEY,
        offer_id TEXT,
        agent_id INTEGER,
        property_code TEXT,
        property_id TEXT,
        property_price NUMERIC,
        offer_amount NUMERIC,
        client_name TEXT,
        offer_date DATE,
        status TEXT,
        source TEXT
    )
""")
print("  Created offers table")

# ============================================================
# STEP 4: Insert data
# ============================================================
print("\n" + "="*60)
print("STEP 4: Inserting data")
print("="*60)

# Insert portal publications
from psycopg2.extras import execute_values
execute_values(
    pgcur,
    """INSERT INTO portal_publications
       (property_id, agent_id, event_date, event_type, portal_name, description, sale_rent)
       VALUES %s""",
    pub_rows,
    page_size=500,
)
print(f"  Inserted {len(pub_rows)} portal publication events")

# Insert offers
execute_values(
    pgcur,
    """INSERT INTO offers
       (offer_id, agent_id, property_code, property_id, property_price,
        offer_amount, client_name, offer_date, status, source)
       VALUES %s""",
    offer_rows,
    page_size=100,
)
print(f"  Inserted {len(offer_rows)} offers")

# ============================================================
# STEP 5: Create/update views
# ============================================================
print("\n" + "="*60)
print("STEP 5: Updating views")
print("="*60)

# 5a. New v_monthly_published: counts unique properties with 'publish' events per month
pgcur.execute("DROP VIEW IF EXISTS v_monthly_published CASCADE")
pgcur.execute("""
    CREATE VIEW v_monthly_published AS
    SELECT
        date_trunc('month', event_date)::date AS period_start,
        agent_id,
        COUNT(DISTINCT property_id) AS published
    FROM portal_publications
    WHERE event_type = 'publish'
    GROUP BY date_trunc('month', event_date)::date, agent_id
""")
print("  Updated v_monthly_published (now uses portal events)")

# Verify
pgcur.execute("""
    SELECT agent_id, published
    FROM v_monthly_published
    WHERE period_start = '2026-02-01'
    ORDER BY published DESC
""")
total_pub = 0
print("  Feb 2026 published by agent:")
for r in pgcur.fetchall():
    print(f"    agent_id={r[0]:>3}, published={r[1]}")
    total_pub += r[1]
print(f"    TOTAL: {total_pub}  (Excel=74)")

# 5b. New v_monthly_offers
pgcur.execute("DROP VIEW IF EXISTS v_monthly_offers CASCADE")
pgcur.execute("""
    CREATE VIEW v_monthly_offers AS
    SELECT
        date_trunc('month', offer_date)::date AS period_start,
        agent_id,
        COUNT(*) AS offers
    FROM offers
    WHERE offer_date IS NOT NULL AND agent_id IS NOT NULL
    GROUP BY date_trunc('month', offer_date)::date, agent_id
""")
print("  Created v_monthly_offers")

# Verify
pgcur.execute("""
    SELECT agent_id, offers
    FROM v_monthly_offers
    WHERE period_start = '2026-02-01'
    ORDER BY offers DESC
""")
total_off = 0
print("  Feb 2026 offers by agent:")
for r in pgcur.fetchall():
    print(f"    agent_id={r[0]:>3}, offers={r[1]}")
    total_off += r[1]
print(f"    TOTAL: {total_off}  (Excel=6)")

# 5c. Update v_monthly_crm_metrics to remove offers (now separate)
pgcur.execute("DROP VIEW IF EXISTS v_monthly_crm_metrics CASCADE")
pgcur.execute("""
    CREATE VIEW v_monthly_crm_metrics AS
    SELECT
        date_trunc('month', sc.change_date::timestamp)::date AS period_start,
        p.agent_id,
        COUNT(*) FILTER (WHERE sc.event_type = 'deactivation') AS withdrawals
    FROM status_changes sc
    JOIN properties p ON sc.property_id = p.property_id
    WHERE p.agent_id IS NOT NULL AND sc.change_date IS NOT NULL
    GROUP BY date_trunc('month', sc.change_date::timestamp)::date, p.agent_id
""")
print("  Updated v_monthly_crm_metrics (removed offers, now separate)")

# 5d. Recreate v_combined_metrics with correct sources
pgcur.execute("DROP VIEW IF EXISTS v_combined_metrics CASCADE")
pgcur.execute("""
    CREATE VIEW v_combined_metrics AS
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
        UNION
        SELECT period_start, agent_id FROM v_monthly_offers
    )
    SELECT
        s.period_start,
        s.agent_id,
        ag.canonical_name,
        ag.office,
        ag.is_team,
        tm.team_id,
        t.team_name,
        COALESCE(reg.registrations, 0) AS crm_registrations,
        COALESCE(ex.exclusives, 0)     AS crm_exclusives,
        COALESCE(ex.exclusives_residential, 0) AS crm_exclusives_residential,
        COALESCE(pub.published, 0)     AS crm_published,
        COALESCE(sh.showings, 0)       AS crm_showings,
        COALESCE(c.withdrawals, 0)     AS crm_withdrawals,
        COALESCE(o.offers, 0)          AS crm_offers,
        COALESCE(cl.closings, 0)       AS crm_closings,
        COALESCE(bi.billing_count, 0)  AS crm_billing,
        COALESCE(gci_all.gci, 0)       AS gci,
        COALESCE(a.acc_listings, 0)    AS acc_registrations,
        COALESCE(a.acc_exclusives, 0)  AS acc_exclusives,
        COALESCE(a.acc_showings, 0)    AS acc_showings,
        COALESCE(a.acc_offers, 0)      AS acc_offers,
        COALESCE(a.acc_closings, 0)    AS acc_closings,
        COALESCE(a.acc_transactions, 0) AS acc_billing
    FROM spine s
    LEFT JOIN agents ag           ON s.agent_id = ag.agent_id
    LEFT JOIN team_members tm     ON s.agent_id = tm.agent_id
    LEFT JOIN teams t             ON tm.team_id = t.team_id
    LEFT JOIN v_monthly_crm_metrics c  ON s.period_start = c.period_start AND s.agent_id = c.agent_id
    LEFT JOIN v_monthly_acc_metrics a  ON s.period_start = a.period_start AND s.agent_id = a.agent_id
    LEFT JOIN v_monthly_registrations reg ON s.period_start = reg.period_start AND s.agent_id = reg.agent_id
    LEFT JOIN v_monthly_exclusives ex ON s.period_start = ex.period_start AND s.agent_id = ex.agent_id
    LEFT JOIN v_monthly_published pub ON s.period_start = pub.period_start AND s.agent_id = pub.agent_id
    LEFT JOIN v_monthly_showings sh  ON s.period_start = sh.period_start AND s.agent_id = sh.agent_id
    LEFT JOIN v_monthly_closings cl  ON s.period_start = cl.period_start AND s.agent_id = cl.agent_id
    LEFT JOIN v_monthly_billing bi   ON s.period_start = bi.period_start AND s.agent_id = bi.agent_id
    LEFT JOIN v_monthly_offers o     ON s.period_start = o.period_start AND s.agent_id = o.agent_id
    LEFT JOIN (
        SELECT period_start, agent_id, SUM(gci) AS gci
        FROM v_monthly_gci
        GROUP BY period_start, agent_id
    ) gci_all ON s.period_start = gci_all.period_start AND s.agent_id = gci_all.agent_id
""")
print("  Recreated v_combined_metrics with correct offers source")

# ============================================================
# STEP 6: Verify final results
# ============================================================
print("\n" + "="*60)
print("STEP 6: Final verification — Feb 2026")
print("="*60)

pgcur.execute("""
    SELECT
        SUM(crm_registrations) AS reg,
        SUM(crm_exclusives) AS excl,
        SUM(crm_published) AS pub,
        SUM(crm_showings) AS show,
        SUM(crm_offers) AS offers,
        SUM(crm_closings) AS closings,
        SUM(crm_billing) AS billing,
        SUM(crm_withdrawals) AS withdrawals
    FROM v_combined_metrics
    WHERE period_start = '2026-02-01'
      AND is_team = false
""")
row = pgcur.fetchone()
print(f"Individual agents (is_team=false):")
print(f"  Καταγραφές:      {row[0]:>4}  (Excel=72)")
print(f"  Αποκλειστικές:   {row[1]:>4}  (Excel=21)")
print(f"  Δημοσιευμένα:    {row[2]:>4}  (Excel=74)")
print(f"  Υποδείξεις:      {row[3]:>4}  (Excel=32)")
print(f"  Προσφορές:       {row[4]:>4}  (Excel=6)")
print(f"  Κλεισίματα:      {row[5]:>4}  (Excel=19)")
print(f"  Συμβολαιοποιήσεις:{row[6]:>4}  (Excel=29)")
print(f"  Αποσύρσεις:      {row[7]:>4}")

# Commit
pg.commit()
print("\n✓ All changes committed successfully!")

crm.close()
wh.close()
pg.close()
