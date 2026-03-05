-- Add transaction_type column to properties (Πώληση / Ενοικίαση)
ALTER TABLE properties ADD COLUMN transaction_type TEXT;

CREATE INDEX idx_properties_txn_type ON properties(transaction_type);
