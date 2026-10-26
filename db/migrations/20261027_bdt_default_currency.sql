-- Set BDT as the default for future subscription ledger rows.
-- Existing records keep their stored currency; legacy USD rows are not rewritten.
ALTER TABLE subscription_payments
  MODIFY COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'BDT';
