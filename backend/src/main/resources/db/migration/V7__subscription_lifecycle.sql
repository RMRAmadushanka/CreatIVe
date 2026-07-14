-- Real-world subscription lifecycle fields
ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS pending_plan_id VARCHAR(32);

ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMP;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_pending_plan_id_fkey'
    ) THEN
        ALTER TABLE subscriptions
            ADD CONSTRAINT subscriptions_pending_plan_id_fkey
            FOREIGN KEY (pending_plan_id) REFERENCES plans (id);
    END IF;
END $$;
