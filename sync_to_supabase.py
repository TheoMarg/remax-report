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
            'transaction_type': r['transaction_type'],
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
    """Sync closings with dedup and validation.

    Dedup: same property_code + closing_month → keep gsheet priority.
    Validation: exclude closings for properties that later had 'Άρση εντολής'.
    """
    logger.info("Syncing closings (with dedup + validation)...")
    rows = sqlite_conn.execute("SELECT * FROM closings").fetchall()

    # ── Validation: only "Έκλεισε από εμάς" (closing_ours) is a real closing ──
    # If a property's most recent status event (deactivation or closing_ours)
    # is NOT closing_ours, all closings for that property are invalid.
    invalidated_rows = sqlite_conn.execute("""
        WITH last_status AS (
            SELECT property_id, event_type,
                   ROW_NUMBER() OVER (PARTITION BY property_id ORDER BY change_date DESC, id DESC) as rn
            FROM status_changes
            WHERE event_type IN ('deactivation', 'closing_ours')
        )
        SELECT property_id FROM last_status
        WHERE rn = 1 AND event_type != 'closing_ours'
    """).fetchall()
    invalidated_props: set[str] = {r['property_id'] for r in invalidated_rows}
    logger.info(f"  {len(invalidated_props)} properties invalidated (last status is not closing_ours)")

    # Only sync CRM closings (source = 'crm_status_change').
    # Gsheet closings are unreliable (batch import dates, no CRM confirmation).
    data = []
    invalidated = 0
    skipped_gsheet = 0
    for r in rows:
        # Skip non-CRM closings
        if r['source'] != 'crm_status_change':
            skipped_gsheet += 1
            continue

        dt = normalize_date(r['closing_date'])
        code = r['property_code'] or ''
        if not code and not r['property_id']:
            continue

        # Validation: skip closings for properties whose last status is not closing_ours
        prop_id = r['property_id']
        if prop_id and prop_id in invalidated_props:
            invalidated += 1
            continue

        agent_id = r['agent_id']
        if agent_id is not None and agent_id not in canonical_ids:
            agent_id = None

        data.append({
            'agent_id':       agent_id,
            'property_id':    r['property_id'],
            'property_code':  code,
            'closing_date':   dt,
            'closing_type':   r['closing_type'],
            'price':          r['price'],
            'gci':            r['gci'],
            'source':         r['source'],
            'source_detail':  r['source_detail'],
        })

    logger.info(f"  closings: {len(rows)} raw, {skipped_gsheet} gsheet skipped, "
                f"{invalidated} invalidated -> {len(data)} CRM closings")

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
    """Sync accountability_reports: aggregate by agent_id + date (SUM numeric fields)."""
    logger.info("Syncing accountability_reports (with aggregation)...")
    rows = sqlite_conn.execute("SELECT * FROM accountability_reports").fetchall()

    # Numeric fields to SUM when multiple entries exist for same (agent, date)
    NUMERIC_FIELDS = [
        'cold_calls', 'follow_up', 'viber_sms', 'mail_newsletter',
        'social_media', 'videos', 'follow_up_assignment', 'follow_up_demand',
        'leads_total', 'leads_in_person', 'cultivation_area', 'eight_by_eight',
        'thirty_three_touches', 'havent_mets', 'mets', 'listings',
        'meetings_sale', 'meetings_rent', 'meetings_buyer', 'meetings_seller',
        'meetings_landlord', 'meetings_tenant', 'showings_sale', 'showings_rent',
        'exclusive_mandate', 'simple_mandate_sale', 'exclusive_rent_hi',
        'exclusive_rent_lo', 'simple_rent', 'signed_offer', 'deposit',
        'appraisals', 'closing_sale', 'closing_rent',
        'transactions_rent_hi', 'transactions_rent_lo',
        'transactions_sale_hi', 'transactions_sale_lo',
        'cooperations', 'photography', 'a4_flyers', 'circular',
        'open_house', 'signage', 'matterport', 'video_property', 'ads',
        'partner_proposal', 'referral', 'conference', 'advertising',
        'absences', 'letter', 'loan', 'proposal',
    ]

    # Aggregate by (agent_id, date): SUM numerics, keep latest timestamp/comments
    grouped: dict[tuple, dict] = {}
    for r in rows:
        if r['agent_id'] not in canonical_ids:
            continue

        ts = normalize_timestamp(r['report_date'])
        if not ts:
            continue

        date_key = ts[:10]
        dedup_key = (r['agent_id'], date_key)

        existing = grouped.get(dedup_key)
        if existing is None:
            # First entry for this (agent, date)
            rec = {
                'agent_id':      r['agent_id'],
                'report_date':   ts,
                'year':          r['year'] or None,
                'month':         r['month'] or None,
                'week':          r['week'] or None,
                'comments':      r['comments'],
                'extra_comments': r['extra_comments'],
                'source':        r['source'],
            }
            for f in NUMERIC_FIELDS:
                rec[f] = r[f] or 0
            grouped[dedup_key] = rec
        else:
            # Accumulate: SUM numeric fields
            for f in NUMERIC_FIELDS:
                existing[f] += (r[f] or 0)
            # Keep latest timestamp and comments
            if ts > existing['report_date']:
                existing['report_date'] = ts
                if r['comments']:
                    existing['comments'] = r['comments']
                if r['extra_comments']:
                    existing['extra_comments'] = r['extra_comments']

    data = list(grouped.values())
    logger.info(f"  accountability: {len(rows)} raw → {len(data)} after aggregation")

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
