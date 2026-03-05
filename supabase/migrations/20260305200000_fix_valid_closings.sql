-- v_valid_closings: only CRM-confirmed closings where last status is closing_ours.
-- Rule: ONLY "Έκλεισε από εμάς" (closing_ours) = real closing.
-- Gsheet closings are excluded at sync time (unreliable batch dates).
-- Properties whose last status event is a non-closing deactivation are excluded.

DROP VIEW IF EXISTS v_valid_closings;

CREATE VIEW v_valid_closings
WITH (security_invoker = true) AS
WITH last_status AS (
    SELECT DISTINCT ON (property_id)
        property_id,
        event_type
    FROM status_changes
    WHERE event_type IN ('deactivation', 'closing_ours')
    ORDER BY property_id, change_date DESC, id DESC
)
SELECT c.*
FROM closings c
INNER JOIN last_status ls ON c.property_id = ls.property_id
WHERE ls.event_type = 'closing_ours';

GRANT SELECT ON v_valid_closings TO anon, authenticated, service_role;
