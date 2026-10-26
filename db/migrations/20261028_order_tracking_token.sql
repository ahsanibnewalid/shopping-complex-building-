-- Store only a digest of a random customer tracking secret.
-- Existing orders remain NULL and must be handled through merchant support;
-- do not backfill a predictable or reversible credential.
ALTER TABLE orders
  ADD COLUMN trackingTokenHash VARCHAR(64) NULL,
  ADD UNIQUE INDEX uq_orders_tracking_token_hash (trackingTokenHash);
