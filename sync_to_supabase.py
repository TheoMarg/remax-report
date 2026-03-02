"""Sync warehouse.sqlite → Supabase Postgres.

Runs after ETL:
    python run.py --mode full && python sync_to_supabase.py

Or via Windows Task Scheduler every Monday 07:00.
Requires: pip install supabase python-dotenv
"""

import json
import logging
import os
import re
import smtplib
import sqlite3
import sys
import time
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client

# ────────────────────────────────────────────────────────────
# Config
# ────────────────────────────────────────────────────────────

load_dotenv(Path(__file__).parent / '.env')

SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_KEY']  # service_role key (bypasses RLS)
SQLITE_PATH  = Path(__file__).parent.parent / 'data' / 'warehouse.sqlite'

CHUNK_SIZE = 1000
MAX_VALID_DATE = (datetime.now() + timedelta(days=365)).strftime('%Y-%m-%d')

# Email notification (optional)
SMTP_HOST     = os.getenv('SMTP_HOST', '')
SMTP_PORT     = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER     = os.getenv('SMTP_USER', '')
SMTP_PASS     = os.getenv('SMTP_PASS', '')
ALERT_EMAIL   = os.getenv('ALERT_EMAIL', '')

_log_dir = Path(__file__).parent / 'logs'
_log_dir.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(_log_dir / 'sync.log', encoding='utf-8'),
    ]
)
logger = logging.getLogger(__name__)


# ────────────────────────────────────────────────────────────
# Date normalization
# ────────────────────────────────────────────────────────────

_DATE_DD_MM_YYYY = re.compile(r'^(\d{2})[-/](\d{2})[-/](\d{4})$')
_DATE_ISO        = re.compile(r'^\d{4}-\d{2}-\d{2}')


def normalize_date(val: str | None) -> str | None:
    """Convert any date format to YYYY-MM-DD. Returns None for empty/invalid."""
    if not val or not val.strip():
        return None
    val = val.strip()
    # DD-MM-YYYY or DD/MM/YYYY
    m = _DATE_DD_MM_YYYY.match(val)
    if m:
        return f'{m.group(3)}-{m.group(2)}-{m.group(1)}'
    # Already ISO-ish: take first 10 chars
    if _DATE_ISO.match(val):
        return val[:10]
    return None


def normalize_timestamp(val: str | None) -> str | None:
    """Normalize ISO timestamps, keeping full precision for TIMESTAMPTZ."""
    if not val or not val.strip():
        return None
    val = val.strip()
    # Already ISO format
    if _DATE_ISO.match(val):
        return val
    return None


def is_valid_date(val: str | None) -> bool:
    """Check if date is within valid range (not future > 1 year)."""
    if not val:
        return True  # NULL dates are OK
    return val <= MAX_VALID_DATE


# ────────────────────────────────────────────────────────────
# SQLite helpers
# ────────────────────────────────────────────────────────────

def get_sqlite_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(str(SQLITE_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def fetch_canonical_agent_ids(conn: sqlite3.Connection) -> set[int]:
    """Return set of agent_ids that have a 'canonical' alias."""
    rows = conn.execute(
        "SELECT DISTINCT agent_id FROM agent_aliases WHERE source = 'canonical'"
    ).fetchall()
    return {r['agent_id'] for r in rows}


# ────────────────────────────────────────────────────────────
# Supabase batch upsert
# ────────────────────────────────────────────────────────────

def batch_upsert(
    supabase: Client,
    table: str,
    rows: list[dict],
    conflict_cols: str,
) -> dict:
    """Upsert rows in chunks. Returns {total, success, errors}."""
    total = len(rows)
    success = 0
    errors = []

    for i in range(0, total, CHUNK_SIZE):
        chunk = rows[i:i + CHUNK_SIZE]
        try:
            supabase.table(table).upsert(
                chunk,
                on_conflict=conflict_cols,
            ).execute()
            success += len(chunk)
        except Exception as e:
            chunk_idx = i // CHUNK_SIZE
            err = {'chunk': chunk_idx, 'error': str(e)[:500], 'rows': len(chunk)}
            errors.append(err)
            logger.error(f"  Chunk {chunk_idx} failed for {table}: {e}")

    return {'total': total, 'success': success, 'errors': errors}


def delete_all_rows(supabase: Client, table: str, id_column: str = 'id'):
    """Delete all rows from a table. Uses the specified id column for the filter."""
    supabase.table(table).delete().gte(id_column, 0).execute()


# ────────────────────────────────────────────────────────────
# Table sync functions
# ────────────────────────────────────────────────────────────

def sync_agents(sqlite_conn, supabase, canonical_ids):
    """Sync only canonical agents."""
    logger.info("Syncing agents...")
    rows = sqlite_conn.execute(
        "SELECT * FROM agents WHERE agent_id IN ({})".format(
            ','.join(str(i) for i in canonical_ids)
        )
    ).fetchall()

    data = []
    for r in rows:
        data.append({
            'agent_id':       r['agent_id'],
            'canonical_name': r['canonical_name'],
            'first_name':     r['first_name'],
            'last_name':      r['last_name'],
            'office':         r['office'],
            'crs_code':       r['crs_code'],
            'start_date':     normalize_date(r['start_date']),
            'is_active':      bool(r['is_active']),
            'is_team':        bool(r['is_team']),
            'notes':          r['notes'],
            'created_at':     normalize_timestamp(r['created_at']),
            'updated_at':     normalize_timestamp(r['updated_at']),
        })

    result = batch_upsert(supabase, 'agents', data, 'agent_id')
    logger.info(f"  agents: {result['success']}/{result['total']} synced")
    return result


def sync_teams(sqlite_conn, supabase):
    logger.info("Syncing teams...")
    rows = sqlite_conn.execute(
        "SELECT * FROM teams WHERE source = 'config'"
    ).fetchall()

    data = [{
        'team_id':       r['team_id'],
        'team_name':     r['team_name'],
        'crm_team_name': r['crm_team_name'],
        'source':        r['source'],
    } for r in rows]

    result = batch_upsert(supabase, 'teams', data, 'team_id')
    logger.info(f"  teams: {result['success']}/{result['total']} synced")
    return result


def sync_team_members(sqlite_conn, supabase, canonical_ids):
    logger.info("Syncing team_members...")
    rows = sqlite_conn.execute("SELECT * FROM team_members").fetchall()

    data = [{
        'team_id':  r['team_id'],
        'agent_id': r['agent_id'],
        'role':     r['role'],
        'source':   r['source'],
    } for r in rows if r['agent_id'] in canonical_ids]

    # Full replace for small table
    try:
        supabase.table('team_members').delete().gte('id', 0).execute()
    except Exception:
        pass

    result = batch_upsert(supabase, 'team_members', data, 'team_id,agent_id')
    logger.info(f"  team_members: {result['success']}/{result['total']} synced")
    return result


def sync_properties(sqlite_conn, supabase, canonical_ids):
    logger.info("Syncing properties...")
    rows = sqlite_conn.execute("SELECT * FROM properties").fetchall()

    data = []
    for r in rows:
        agent_id = r['agent_id']
        # Map non-canonical agents to NULL
        if agent_id is not None and agent_id not in canonical_ids:
            agent_id = None

        data.append({
            'property_id':      r['property_id'],
            'crm_code':         r['crm_code'],
            'property_code':    r['property_code'],
            'agent_id':         agent_id,
            'category':         r['category'],
            'subcategory':      r['subcategory'],
            'area':             r['area'],
            'region':           r['region'],
            'prefecture':       r['prefecture'],
            'address':          r['address'],
            'price':            r['price'],
            'size_sqm':         r['size_sqm'],
            'plot_sqm':         r['plot_sqm'],
            'bedrooms':         r['bedrooms'],
            'floor':            r['floor'],
            'year_built':       r['year_built'],
            'energy_class':     r['energy_class'],
            'is_exclusive':     bool(r['is_exclusive']) if r['is_exclusive'] else False,
            'exclusive_start':  normalize_date(r['exclusive_start']),
            'exclusive_end':    normalize_date(r['exclusive_end']),
            'is_retired':       bool(r['is_retired']) if r['is_retired'] else False,
            'retirement_date':  normalize_date(r['retirement_date']),
            'retirement_reason': r['retirement_reason'],
            'days_on_market':   r['days_on_market'],
            'first_pub_date':   normalize_timestamp(r['first_pub_date']),
            'lat':              r['lat'],
            'lng':              r['lng'],
            'payload_hash':     r['payload_hash'],
            'first_seen_at':    normalize_timestamp(r['first_seen_at']),
            'last_seen_at':     normalize_timestamp(r['last_seen_at']),
            'source':           r['source'],
            'updated_at':       normalize_timestamp(r['updated_at']),
            'broker_code':      r['broker_code'],
        })

    result = batch_upsert(supabase, 'properties', data, 'property_id')
    logger.info(f"  properties: {result['success']}/{result['total']} synced")
    return result


def sync_status_changes(sqlite_conn, supabase):
    logger.info("Syncing status_changes...")
    rows = sqlite_conn.execute("SELECT * FROM status_changes").fetchall()

    data = []
    skipped = 0
    for r in rows:
        dt = normalize_date(r['change_date'])
        if not is_valid_date(dt):
            skipped += 1
            continue
        data.append({
            'property_id': r['property_id'],
            'change_date': dt,
            'description': (r['description'] or '')[:200],
            'event_type':  r['event_type'],
            'source':      r['source'],
        })

    if skipped:
        logger.warning(f"  Skipped {skipped} status_changes with invalid dates")

    result = batch_upsert(supabase, 'status_changes', data,
                          'property_id,change_date,event_type')
    logger.info(f"  status_changes: {result['success']}/{result['total']} synced")
    return result


def sync_price_changes(sqlite_conn, supabase):
    logger.info("Syncing price_changes...")
    rows = sqlite_conn.execute("SELECT * FROM price_changes").fetchall()

    data = [{
        'property_id': r['property_id'],
        'change_date': normalize_date(r['change_date']),
        'old_price':   r['old_price'],
        'new_price':   r['new_price'],
        'change_eur':  r['change_eur'],
        'change_pct':  r['change_pct'],
        'source':      r['source'],
    } for r in rows]

    result = batch_upsert(supabase, 'price_changes', data,
                          'property_id,change_date,old_price,new_price')
    logger.info(f"  price_changes: {result['success']}/{result['total']} synced")
    return result


def sync_closings(sqlite_conn, supabase, canonical_ids):
    """Sync closings with dedup: same property_code + closing_month → keep gsheet priority."""
    logger.info("Syncing closings (with dedup)...")
    rows = sqlite_conn.execute("SELECT * FROM closings").fetchall()

    # Priority: gsheet_closings > crm_status_change
    SOURCE_PRIORITY = {'gsheet_closings': 0, 'crm_status_change': 1}

    # Group by (property_code, closing_month) for dedup
    grouped: dict[tuple, dict] = {}
    for r in rows:
        dt = normalize_date(r['closing_date'])
        code = r['property_code'] or ''
        if not code and not r['property_id']:
            continue  # Skip rows with neither code nor property_id

        # closing_month for dedup
        month_key = dt[:7] if dt else 'unknown'
        dedup_key = (code, month_key)

        agent_id = r['agent_id']
        if agent_id is not None and agent_id not in canonical_ids:
            agent_id = None

        rec = {
            'agent_id':       agent_id,
            'property_id':    r['property_id'],
            'property_code':  code,
            'closing_date':   dt,
            'closing_type':   r['closing_type'],
            'price':          r['price'],
            'gci':            r['gci'],
            'source':         r['source'],
            'source_detail':  r['source_detail'],
        }

        existing = grouped.get(dedup_key)
        if existing is None:
            grouped[dedup_key] = rec
        else:
            # Keep higher priority source
            old_prio = SOURCE_PRIORITY.get(existing['source'], 99)
            new_prio = SOURCE_PRIORITY.get(rec['source'], 99)
            if new_prio < old_prio:
                grouped[dedup_key] = rec
            elif new_prio == old_prio:
                # Same source: keep the one with more data (gci not null)
                if rec['gci'] and not existing['gci']:
                    grouped[dedup_key] = rec

    data = list(grouped.values())
    logger.info(f"  closings: {len(rows)} raw → {len(data)} after dedup")

    # DELETE + INSERT: after dedup each (property_code, closing_date) is unique,
    # so upsert with the old 3-col constraint won't catch cross-source duplicates.
    # Full replace is safest for a deduped dataset.
    try:
        supabase.table('closings').delete().gte('id', 0).execute()
    except Exception as e:
        logger.warning(f"  closings delete failed, proceeding with upsert: {e}")

    result = batch_upsert(supabase, 'closings', data,
                          'property_code,closing_date,source')
    logger.info(f"  closings: {result['success']}/{result['total']} synced")
    return result


def sync_exclusives(sqlite_conn, supabase, canonical_ids):
    logger.info("Syncing exclusives...")
    rows = sqlite_conn.execute("SELECT * FROM exclusives").fetchall()

    data = []
    for r in rows:
        agent_id = r['agent_id']
        if agent_id is not None and agent_id not in canonical_ids:
            agent_id = None

        data.append({
            'agent_id':      agent_id,
            'property_code': r['property_code'],
            'property_id':   r['property_id'],
            'owner_name':    r['owner_name'],
            'sign_date':     normalize_date(r['sign_date']),
            'end_date':      normalize_date(r['end_date']),
            'office':        r['office'],
            'status':        r['status'],
            'source':        r['source'],
        })

    result = batch_upsert(supabase, 'exclusives', data,
                          'property_code,sign_date,source')
    logger.info(f"  exclusives: {result['success']}/{result['total']} synced")
    return result


def sync_ypodikseis(sqlite_conn, supabase, canonical_ids):
    logger.info("Syncing ypodikseis...")
    rows = sqlite_conn.execute("SELECT * FROM ypodikseis").fetchall()

    data = []
    for r in rows:
        agent_id = r['agent_id']
        if agent_id is not None and agent_id not in canonical_ids:
            agent_id = None

        data.append({
            'agent_id':      agent_id,
            'property_id':   r['property_id'],
            'showing_date':  normalize_date(r['showing_date']),
            'client_name':   r['client_name'],
            'manager_name':  r['manager_name'],
            'source':        r['source'],
        })

    result = batch_upsert(supabase, 'ypodikseis', data,
                          'property_id,showing_date,client_name,source')
    logger.info(f"  ypodikseis: {result['success']}/{result['total']} synced")
    return result


def sync_accountability(sqlite_conn, supabase, canonical_ids):
    """Sync accountability_reports with dedup: agent_id + report_date → keep latest."""
    logger.info("Syncing accountability_reports (with dedup)...")
    rows = sqlite_conn.execute("SELECT * FROM accountability_reports").fetchall()

    # Dedup by (agent_id, date(report_date)), keep latest timestamp
    grouped: dict[tuple, dict] = {}
    for r in rows:
        if r['agent_id'] not in canonical_ids:
            continue

        ts = normalize_timestamp(r['report_date'])
        if not ts:
            continue

        date_key = ts[:10]
        dedup_key = (r['agent_id'], date_key)

        rec = {
            'agent_id':              r['agent_id'],
            'report_date':           ts,
            'year':                  r['year'] or None,
            'month':                 r['month'] or None,
            'week':                  r['week'] or None,
            'cold_calls':            r['cold_calls'] or 0,
            'follow_up':             r['follow_up'] or 0,
            'viber_sms':             r['viber_sms'] or 0,
            'mail_newsletter':       r['mail_newsletter'] or 0,
            'social_media':          r['social_media'] or 0,
            'videos':                r['videos'] or 0,
            'follow_up_assignment':  r['follow_up_assignment'] or 0,
            'follow_up_demand':      r['follow_up_demand'] or 0,
            'leads_total':           r['leads_total'] or 0,
            'leads_in_person':       r['leads_in_person'] or 0,
            'cultivation_area':      r['cultivation_area'] or 0,
            'eight_by_eight':        r['eight_by_eight'] or 0,
            'thirty_three_touches':  r['thirty_three_touches'] or 0,
            'havent_mets':           r['havent_mets'] or 0,
            'mets':                  r['mets'] or 0,
            'listings':              r['listings'] or 0,
            'meetings_sale':         r['meetings_sale'] or 0,
            'meetings_rent':         r['meetings_rent'] or 0,
            'meetings_buyer':        r['meetings_buyer'] or 0,
            'meetings_seller':       r['meetings_seller'] or 0,
            'meetings_landlord':     r['meetings_landlord'] or 0,
            'meetings_tenant':       r['meetings_tenant'] or 0,
            'showings_sale':         r['showings_sale'] or 0,
            'showings_rent':         r['showings_rent'] or 0,
            'exclusive_mandate':     r['exclusive_mandate'] or 0,
            'simple_mandate_sale':   r['simple_mandate_sale'] or 0,
            'exclusive_rent_hi':     r['exclusive_rent_hi'] or 0,
            'exclusive_rent_lo':     r['exclusive_rent_lo'] or 0,
            'simple_rent':           r['simple_rent'] or 0,
            'signed_offer':          r['signed_offer'] or 0,
            'deposit':               r['deposit'] or 0,
            'appraisals':            r['appraisals'] or 0,
            'closing_sale':          r['closing_sale'] or 0,
            'closing_rent':          r['closing_rent'] or 0,
            'transactions_rent_hi':  r['transactions_rent_hi'] or 0,
            'transactions_rent_lo':  r['transactions_rent_lo'] or 0,
            'transactions_sale_hi':  r['transactions_sale_hi'] or 0,
            'transactions_sale_lo':  r['transactions_sale_lo'] or 0,
            'cooperations':          r['cooperations'] or 0,
            'photography':           r['photography'] or 0,
            'a4_flyers':             r['a4_flyers'] or 0,
            'circular':              r['circular'] or 0,
            'open_house':            r['open_house'] or 0,
            'signage':               r['signage'] or 0,
            'matterport':            r['matterport'] or 0,
            'video_property':        r['video_property'] or 0,
            'ads':                   r['ads'] or 0,
            'partner_proposal':      r['partner_proposal'] or 0,
            'comments':              r['comments'],
            'referral':              r['referral'] or 0,
            'conference':            r['conference'] or 0,
            'advertising':           r['advertising'] or 0,
            'absences':              r['absences'] or 0,
            'letter':                r['letter'] or 0,
            'loan':                  r['loan'] or 0,
            'proposal':              r['proposal'] or 0,
            'extra_comments':        r['extra_comments'],
            'source':                r['source'],
        }

        existing = grouped.get(dedup_key)
        if existing is None or ts > existing['report_date']:
            grouped[dedup_key] = rec

    data = list(grouped.values())
    logger.info(f"  accountability: {len(rows)} raw → {len(data)} after dedup")

    result = batch_upsert(supabase, 'accountability_reports', data,
                          'agent_id,report_date')
    logger.info(f"  accountability: {result['success']}/{result['total']} synced")
    return result


def sync_billing(sqlite_conn, supabase, canonical_ids):
    logger.info("Syncing billing_transactions...")
    rows = sqlite_conn.execute("SELECT * FROM billing_transactions").fetchall()

    data = []
    for r in rows:
        agent_id = r['agent_id']
        if agent_id is not None and agent_id not in canonical_ids:
            agent_id = None

        data.append({
            'agent_id':       agent_id,
            'office':         r['office'],
            'billing_month':  r['billing_month'],
            'seq_num':        r['seq_num'],
            'property_code':  r['property_code'],
            'property_type':  r['property_type'],
            'property_value': r['property_value'],
            'gci':            r['gci'],
            'is_rental':      bool(r['is_rental']),
            'seller_name':    r['seller_name'],
            'buyer_name':     r['buyer_name'],
            'referral':       r['referral'],
            'rental_col':     r['rental_col'],
            'source_file':    r['source_file'],
            'property_id':    r['property_id'],
        })

    result = batch_upsert(supabase, 'billing_transactions', data,
                          'office,billing_month,seq_num')
    logger.info(f"  billing: {result['success']}/{result['total']} synced")
    return result


def sync_targets(sqlite_conn, supabase, canonical_ids):
    logger.info("Syncing targets_annual...")
    rows = sqlite_conn.execute("SELECT * FROM targets_annual").fetchall()

    data = [{
        'agent_id':          r['agent_id'],
        'year':              r['year'],
        'office':            r['office'],
        'gci_target':        r['gci_target'],
        'gci_realistic':     r['gci_realistic'],
        'exclusives_target': r['exclusives_target'],
        'source':            r['source'],
    } for r in rows if r['agent_id'] in canonical_ids]

    result = batch_upsert(supabase, 'targets_annual', data,
                          'agent_id,year,source')
    logger.info(f"  targets: {result['success']}/{result['total']} synced")
    return result


# ────────────────────────────────────────────────────────────
# Post-sync verification
# ────────────────────────────────────────────────────────────

def verify_sync(supabase: Client) -> list[str]:
    """Run post-sync checks. Returns list of warnings."""
    warnings = []

    checks = {
        'agents':                ('count', 30, 60),
        'properties':            ('count', 6000, 10000),
        'status_changes':        ('count', 12000, 20000),
        'closings':              ('count', 2000, 6000),
        'exclusives':            ('count', 500, 2000),
        'accountability_reports': ('count', 200, 1000),
    }

    for table, (_, lo, hi) in checks.items():
        try:
            resp = supabase.table(table).select('*', count='exact', head=True).execute()
            cnt = resp.count
            if cnt < lo:
                msg = f"WARNING: {table} has {cnt} rows (expected >= {lo})"
                warnings.append(msg)
                logger.warning(msg)
            else:
                logger.info(f"  {table}: {cnt} rows OK")
        except Exception as e:
            warnings.append(f"ERROR checking {table}: {e}")

    return warnings


# ────────────────────────────────────────────────────────────
# Email notification
# ────────────────────────────────────────────────────────────

def send_alert(subject: str, body: str):
    """Send email alert if SMTP is configured."""
    if not SMTP_HOST or not ALERT_EMAIL:
        logger.info("Email not configured, skipping alert")
        return

    try:
        msg = MIMEText(body, 'plain', 'utf-8')
        msg['Subject'] = subject
        msg['From'] = SMTP_USER
        msg['To'] = ALERT_EMAIL

        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        logger.info(f"Alert email sent to {ALERT_EMAIL}")
    except Exception as e:
        logger.error(f"Failed to send alert email: {e}")


# ────────────────────────────────────────────────────────────
# Main
# ────────────────────────────────────────────────────────────

def main():
    started_at = datetime.now(timezone.utc).isoformat()
    logger.info("=" * 60)
    logger.info("Starting Supabase sync")
    logger.info(f"SQLite: {SQLITE_PATH}")
    logger.info(f"Supabase: {SUPABASE_URL}")
    logger.info("=" * 60)

    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    sqlite_conn = get_sqlite_conn()
    canonical_ids = fetch_canonical_agent_ids(sqlite_conn)
    logger.info(f"Canonical agents: {len(canonical_ids)}")

    results = {}
    overall_status = 'success'

    # Sync order matters (FK dependencies)
    sync_steps = [
        ('agents',                 lambda: sync_agents(sqlite_conn, supabase, canonical_ids)),
        ('teams',                  lambda: sync_teams(sqlite_conn, supabase)),
        ('team_members',           lambda: sync_team_members(sqlite_conn, supabase, canonical_ids)),
        ('properties',             lambda: sync_properties(sqlite_conn, supabase, canonical_ids)),
        ('status_changes',         lambda: sync_status_changes(sqlite_conn, supabase)),
        ('price_changes',          lambda: sync_price_changes(sqlite_conn, supabase)),
        ('closings',               lambda: sync_closings(sqlite_conn, supabase, canonical_ids)),
        ('exclusives',             lambda: sync_exclusives(sqlite_conn, supabase, canonical_ids)),
        ('ypodikseis',             lambda: sync_ypodikseis(sqlite_conn, supabase, canonical_ids)),
        ('accountability_reports', lambda: sync_accountability(sqlite_conn, supabase, canonical_ids)),
        ('billing_transactions',   lambda: sync_billing(sqlite_conn, supabase, canonical_ids)),
        ('targets_annual',         lambda: sync_targets(sqlite_conn, supabase, canonical_ids)),
    ]

    for table_name, sync_fn in sync_steps:
        try:
            result = sync_fn()
            results[table_name] = result
            if result.get('errors'):
                overall_status = 'partial'
        except Exception as e:
            logger.error(f"FAILED syncing {table_name}: {e}")
            results[table_name] = {'total': 0, 'success': 0, 'errors': [str(e)]}
            overall_status = 'partial'

    # Post-sync verification
    logger.info("\nRunning post-sync verification...")
    warnings = verify_sync(supabase)
    if warnings:
        overall_status = 'partial'

    # Log to sync_log
    ended_at = datetime.now(timezone.utc).isoformat()
    try:
        supabase.table('sync_log').insert({
            'started_at':    started_at,
            'ended_at':      ended_at,
            'status':        overall_status,
            'tables_synced': json.dumps(results, default=str),
            'error_message': '\n'.join(warnings) if warnings else None,
        }).execute()
    except Exception as e:
        logger.error(f"Failed to write sync_log: {e}")

    sqlite_conn.close()

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info(f"Sync completed: {overall_status}")
    for table, res in results.items():
        errs = len(res.get('errors', []))
        logger.info(f"  {table}: {res.get('success', 0)}/{res.get('total', 0)}"
                     + (f" ({errs} errors)" if errs else ""))
    logger.info("=" * 60)

    # Alert on failure
    if overall_status != 'success':
        send_alert(
            f"[Remax Sync] {overall_status.upper()}",
            f"Sync finished with status: {overall_status}\n\n"
            + '\n'.join(warnings)
            + f"\n\nDetails:\n{json.dumps(results, indent=2, default=str)}"
        )

    return 0 if overall_status == 'success' else 1


if __name__ == '__main__':
    sys.exit(main())
