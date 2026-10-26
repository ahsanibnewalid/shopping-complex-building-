CREATE TABLE IF NOT EXISTS product_reviews (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 tenantId BIGINT UNSIGNED NOT NULL,
 productId BIGINT UNSIGNED NOT NULL,
 orderId BIGINT UNSIGNED NOT NULL,
 orderItemId BIGINT UNSIGNED NOT NULL,
 authorName VARCHAR(255) NOT NULL,
 rating INT NOT NULL,
 comment TEXT NOT NULL,
 createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_review_order_item (orderItemId),
 INDEX idx_reviews_product (productId),
 FOREIGN KEY (tenantId) REFERENCES tenants(id),
 FOREIGN KEY (productId) REFERENCES products(id),
 FOREIGN KEY (orderId) REFERENCES orders(id),
 FOREIGN KEY (orderItemId) REFERENCES order_items(id),
 CONSTRAINT chk_review_rating CHECK (rating BETWEEN 1 AND 5)
);
