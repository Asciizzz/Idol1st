USE idol1st;

-- =============================================================
--  LAYER 4 — COMMERCE
--  Products, orders, order line items — scoped to a tenant.
-- =============================================================

CREATE TABLE products (
    id           CHAR(36)      NOT NULL DEFAULT (UUID()),
    tenant_id    CHAR(36)      NOT NULL,
    name         VARCHAR(255)  NOT NULL,
    description  TEXT              NULL,
    price_cents  INT UNSIGNED  NOT NULL DEFAULT 0,  -- store in cents to avoid float issues
    stock        INT           NOT NULL DEFAULT 0,  -- -1 = unlimited
    image_url    VARCHAR(500)      NULL,
    status       ENUM(
                   'draft',
                   'active',
                   'sold_out',
                   'archived'
                 )             NOT NULL DEFAULT 'draft',
    created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
                                         ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_product_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
    INDEX idx_products_tenant_status (tenant_id, status)
);

CREATE TABLE orders (
    id           CHAR(36)     NOT NULL DEFAULT (UUID()),
    tenant_id    CHAR(36)     NOT NULL,
    user_id      CHAR(36)     NOT NULL,
    total_cents  INT UNSIGNED NOT NULL DEFAULT 0,
    status       ENUM(
                   'pending',    -- placed, not yet confirmed
                   'confirmed',  -- confirmed by tenant admin
                   'shipped',    -- dispatched
                   'delivered',  -- received
                   'cancelled'
                 )            NOT NULL DEFAULT 'pending',
    notes        TEXT             NULL,  -- optional message from fan
    created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
                                        ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    CONSTRAINT fk_order_tenant FOREIGN KEY (tenant_id) REFERENCES tenants (id) ON DELETE CASCADE,
    CONSTRAINT fk_order_user   FOREIGN KEY (user_id)   REFERENCES users   (id),
    INDEX idx_orders_tenant_status (tenant_id, status)
);

-- One row per product line in an order.
-- unit_price_cents is snapshotted at time of order so price changes don't affect history.
CREATE TABLE order_items (
    id               CHAR(36)     NOT NULL DEFAULT (UUID()),
    order_id         CHAR(36)     NOT NULL,
    product_id       CHAR(36)         NULL,   -- NULL if product was deleted
    product_name     VARCHAR(255) NOT NULL,   -- snapshot of name at order time
    unit_price_cents INT UNSIGNED NOT NULL,   -- snapshot of price at order time
    quantity         SMALLINT     NOT NULL DEFAULT 1,

    PRIMARY KEY (id),
    CONSTRAINT fk_item_order   FOREIGN KEY (order_id)   REFERENCES orders   (id) ON DELETE CASCADE,
    CONSTRAINT fk_item_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
);