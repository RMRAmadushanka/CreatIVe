-- Align usage_counters.period_yyyy_mm with JPA VARCHAR mapping
ALTER TABLE usage_counters
    ALTER COLUMN period_yyyy_mm TYPE VARCHAR(7);
