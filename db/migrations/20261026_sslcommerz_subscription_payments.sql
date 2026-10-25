-- SSLCommerz subscription payment tracking.
-- Review the deployed schema and take a backup before applying in production.
ALTER TABLE subscription_payments
  ADD COLUMN tranId VARCHAR(100) NULL,
  ADD COLUMN valId VARCHAR(100) NULL,
  ADD COLUMN planId VARCHAR(20) NULL,
  ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  ADD COLUMN status ENUM('INITIATED','VALIDATED','FAILED','CANCELLED','OFFLINE') NOT NULL DEFAULT 'OFFLINE',
  ADD COLUMN gatewayRawResponse TEXT NULL,
  MODIFY COLUMN paidAt TIMESTAMP NULL DEFAULT NULL,
  ADD UNIQUE INDEX uq_subscription_payment_tran_id (tranId);

-- Existing rows are legacy ledger entries, not verified SSLCommerz transactions.
-- Keep their currency as USD because the previous UI formatted monthlyCents as USD.
-- Newly initiated gateway payments explicitly store BDT and status=INITIATED.

-- BazarHub's published Starter/Pro/Business price points are now BDT 1,500/3,500/7,500.
-- Convert the known legacy defaults from the previous USD-cent representation to BDT paisa.
-- Custom monthly amounts are intentionally left unchanged for manual reconciliation.
UPDATE subscriptions
SET monthlyCents = CASE plan
  WHEN 'starter' THEN 150000
  WHEN 'pro' THEN 350000
  WHEN 'business' THEN 750000
END
WHERE (plan = 'starter' AND monthlyCents = 1900)
   OR (plan = 'pro' AND monthlyCents = 4900)
   OR (plan = 'business' AND monthlyCents = 9900);
