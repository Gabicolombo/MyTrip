-- Apply once to an existing auth database when synchronize is disabled.
-- Existing accounts must verify their email using the resend endpoint.
BEGIN;
ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "emailVerified" boolean NOT NULL DEFAULT false;
COMMIT;
