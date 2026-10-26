CREATE TABLE IF NOT EXISTS tenant_bookings (
 id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
 tenantId BIGINT UNSIGNED NOT NULL,
 serviceId BIGINT UNSIGNED NOT NULL,
 customerName VARCHAR(255) NOT NULL,
 customerEmail VARCHAR(320) NOT NULL,
 customerPhone VARCHAR(60) NULL,
 note TEXT NULL,
 startsAt TIMESTAMP NOT NULL,
 durationMinutes INT NOT NULL DEFAULT 60,
 status ENUM('requested','confirmed','completed','cancelled') NOT NULL DEFAULT 'requested',
 createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 INDEX idx_bookings_tenant_start (tenantId, startsAt),
 CONSTRAINT fk_bookings_tenant FOREIGN KEY (tenantId) REFERENCES tenants(id),
 CONSTRAINT fk_bookings_service FOREIGN KEY (serviceId) REFERENCES products(id)
);
