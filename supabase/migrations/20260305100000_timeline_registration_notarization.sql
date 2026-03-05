-- Add registration + notarization events to v_property_events_timeline
-- registration: from properties.registration_date (when property was first entered in CRM)
-- notarization: from billing_transactions.billing_month (when contract was signed at notary)

DROP VIEW IF EXISTS v_property_events_timeline;

CREATE VIEW v_property_events_timeline
WITH (security_invoker = true) AS
-- Registration (first entry in CRM)
SELECT p.property_id, p.registration_date::date AS event_date, 'registration' AS event_type,
       'Καταγραφή' AS detail, NULL::numeric AS amount
FROM properties p WHERE p.registration_date IS NOT NULL
UNION ALL
-- Activation
SELECT property_id, change_date AS event_date, 'activation' AS event_type,
       LEFT(description, 200) AS detail, NULL::numeric AS amount
FROM status_changes WHERE event_type = 'activation'
UNION ALL
-- Exclusive
SELECT e.property_id, e.sign_date AS event_date, 'exclusive' AS event_type,
       'Αποκλειστική εντολή' AS detail, NULL::numeric AS amount
FROM exclusives e WHERE e.property_id IS NOT NULL AND e.sign_date IS NOT NULL
UNION ALL
-- Published
SELECT p.property_id, p.first_pub_date::date AS event_date, 'published' AS event_type,
       'Δημοσίευση' AS detail, NULL::numeric AS amount
FROM properties p WHERE p.first_pub_date IS NOT NULL
UNION ALL
-- Price change
SELECT pc.property_id, pc.change_date AS event_date, 'price_change' AS event_type,
       pc.old_price::text || ' → ' || pc.new_price::text AS detail,
       pc.change_eur AS amount
FROM price_changes pc
UNION ALL
-- Deposit
SELECT property_id, change_date AS event_date, 'deposit' AS event_type,
       LEFT(description, 200) AS detail, NULL::numeric AS amount
FROM status_changes WHERE event_type = 'deposit'
UNION ALL
-- Deactivation
SELECT property_id, change_date AS event_date, 'deactivation' AS event_type,
       LEFT(description, 200) AS detail, NULL::numeric AS amount
FROM status_changes WHERE event_type = 'deactivation'
UNION ALL
-- Exclusive end (expiry)
SELECT e.property_id, e.end_date AS event_date, 'exclusive_end' AS event_type,
       'Λήξη αποκλειστικότητας' AS detail, NULL::numeric AS amount
FROM exclusives e WHERE e.property_id IS NOT NULL AND e.end_date IS NOT NULL
UNION ALL
-- Closing
SELECT c.property_id, c.closing_date AS event_date, 'closing' AS event_type,
       c.closing_type AS detail, c.price AS amount
FROM closings c WHERE c.property_id IS NOT NULL
UNION ALL
-- Showing
SELECT y.property_id, y.showing_date AS event_date, 'showing' AS event_type,
       y.client_name AS detail, NULL::numeric AS amount
FROM ypodikseis y WHERE y.property_id IS NOT NULL
UNION ALL
-- Notarization (from billing transactions)
SELECT bt.property_id, make_date(
         CAST(LEFT(bt.billing_month, 4) AS int),
         CAST(RIGHT(bt.billing_month, 2) AS int),
         1
       ) AS event_date, 'notarization' AS event_type,
       'Συμβολαιοποίηση' AS detail, bt.gci AS amount
FROM billing_transactions bt WHERE bt.property_id IS NOT NULL;
