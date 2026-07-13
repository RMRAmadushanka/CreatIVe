-- Plans, subscriptions, usage counters, and checkout orders for PayHere billing.

CREATE TABLE plans (
    id                      VARCHAR(32)  PRIMARY KEY,
    name                    VARCHAR(64)  NOT NULL,
    price_lkr               INT          NOT NULL DEFAULT 0,
    billing_interval        VARCHAR(16)  NOT NULL DEFAULT 'month',
    max_projects            INT          NOT NULL,
    max_pages_per_project   INT          NOT NULL,
    max_media_uploads_month INT          NOT NULL,
    -- Comma-separated builder ElementType ids; use '*' for all components
    builder_components      TEXT         NOT NULL,
    sort_order              INT          NOT NULL DEFAULT 0,
    active                  BOOLEAN      NOT NULL DEFAULT TRUE
);

CREATE TABLE subscriptions (
    id                       UUID         PRIMARY KEY,
    user_id                  VARCHAR(36)  NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    plan_id                  VARCHAR(32)  NOT NULL REFERENCES plans (id),
    status                   VARCHAR(24)  NOT NULL,
    current_period_start     TIMESTAMP,
    current_period_end       TIMESTAMP,
    payhere_subscription_id  VARCHAR(64),
    payhere_order_id         VARCHAR(64),
    cancel_at_period_end     BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at               TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at               TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT subscriptions_status_check CHECK (
        status IN ('active', 'past_due', 'cancelled', 'expired')
    )
);

CREATE UNIQUE INDEX uq_subscriptions_one_active
    ON subscriptions (user_id)
    WHERE status IN ('active', 'past_due');

CREATE INDEX idx_subscriptions_user_id ON subscriptions (user_id);

CREATE TABLE usage_counters (
    user_id          VARCHAR(36) NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    period_yyyy_mm   CHAR(7)     NOT NULL,
    media_uploads    INT         NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, period_yyyy_mm)
);

CREATE TABLE billing_orders (
    id           UUID         PRIMARY KEY,
    order_id     VARCHAR(64)  NOT NULL UNIQUE,
    user_id      VARCHAR(36)  NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    plan_id      VARCHAR(32)  NOT NULL REFERENCES plans (id),
    amount_lkr   INT          NOT NULL,
    status       VARCHAR(24)  NOT NULL DEFAULT 'pending',
    created_at   TIMESTAMP    NOT NULL DEFAULT now(),
    paid_at      TIMESTAMP,
    CONSTRAINT billing_orders_status_check CHECK (
        status IN ('pending', 'paid', 'failed')
    )
);

CREATE INDEX idx_billing_orders_user_id ON billing_orders (user_id);

-- Seed three monthly plans
INSERT INTO plans (
    id, name, price_lkr, billing_interval,
    max_projects, max_pages_per_project, max_media_uploads_month,
    builder_components, sort_order, active
) VALUES
(
    'free',
    'Free',
    0,
    'month',
    1,
    3,
    20,
    'section,fullSection,row,grid,heading,richText,text,image,button',
    1,
    TRUE
),
(
    'pro',
    'Pro',
    2990,
    'month',
    10,
    20,
    500,
    'section,fullSection,row,grid,heading,richText,text,image,button,icon,form,accordion,tabs,navbar,featureCard,card,footer',
    2,
    TRUE
),
(
    'business',
    'Business',
    7990,
    'month',
    100,
    100,
    -1,
    '*',
    3,
    TRUE
);

-- Backfill Free plan for existing users
INSERT INTO subscriptions (id, user_id, plan_id, status, current_period_start, current_period_end, created_at, updated_at)
SELECT
    gen_random_uuid(),
    u.id,
    'free',
    'active',
    now(),
    now() + INTERVAL '100 years',
    now(),
    now()
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM subscriptions s
    WHERE s.user_id = u.id AND s.status IN ('active', 'past_due')
);
