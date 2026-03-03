-- Fix v_withdrawal_reasons: include closing_ours events (Έκλεισε από εμάς)
-- Previously only event_type = 'deactivation' was included, missing 1400+ closings
-- Per BROKER_REPORT_RULES §8: event_type IN ('deactivation', 'closing_ours')

DROP VIEW IF EXISTS v_withdrawal_reasons;

CREATE VIEW v_withdrawal_reasons
WITH (security_invoker = true) AS
SELECT
    date_trunc('month', sc.change_date)::date   AS period_start,
    p.agent_id,
    CASE
        WHEN sc.event_type = 'closing_ours'                    THEN 'Έκλεισε από εμάς'
        WHEN sc.description ILIKE '%Σε εκκρεμότητα%'           THEN 'Σε εκκρεμότητα'
        WHEN sc.description ILIKE '%Ανενεργό%'                  THEN 'Ανενεργό'
        WHEN sc.description ILIKE '%Άρση εντολής%'              THEN 'Άρση εντολής'
        WHEN sc.description ILIKE '%Έκλεισε από τον πελάτη%'    THEN 'Έκλεισε από τον πελάτη'
        WHEN sc.description ILIKE '%Έκλεισε από άλλο μεσίτη%'  THEN 'Έκλεισε από άλλο μεσίτη'
        WHEN sc.description ILIKE '%Προβληματικός πωλητής%'     THEN 'Προβληματικός πωλητής'
        WHEN sc.description ILIKE '%Μεγάλη τιμή%'               THEN 'Μεγάλη τιμή'
        WHEN sc.description ILIKE '%Πρόβλημα αρτιότητας%'       THEN 'Πρόβλημα αρτιότητας'
        WHEN sc.description ILIKE '%Προς έλεγχο%'               THEN 'Προς έλεγχο - Χαρτιά'
        WHEN sc.description ILIKE '%Συμβόλαιο σε εξέλιξη%'     THEN 'Συμβόλαιο σε εξέλιξη'
        ELSE 'Άλλο'
    END AS reason,
    COUNT(*) AS cnt
FROM status_changes sc
JOIN properties p ON sc.property_id = p.property_id
WHERE sc.event_type IN ('deactivation', 'closing_ours')
  AND sc.change_date IS NOT NULL
GROUP BY 1, 2, 3;
