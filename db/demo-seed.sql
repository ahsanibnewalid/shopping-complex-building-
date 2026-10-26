-- BazarHub local demo seed data.
-- All names and contact details below are fictional. No login accounts, orders,
-- payment records, API credentials, or customer personal data are seeded.
-- Safe to re-run: tenants are inserted only when their slug is not already present,
-- and products are inserted only when the same tenant/name pair does not exist.

INSERT IGNORE INTO tenants
  (slug, name, tagline, description, businessType, category, themeId, location, contactEmail, phone, status)
VALUES
  ('demo-noor-electronics', 'Demo Noor Electronics', 'Everyday tech, made simple',
   'Fictional demo store for testing catalogue browsing and merchant storefronts.',
   'ecommerce', 'Electronics', 'archive', 'Demo Floor 1 · Unit 101',
   'electronics@example.invalid', '+8801000000001', 'active'),
  ('demo-paper-tree', 'Demo Paper Tree', 'Books, stationery and study essentials',
   'Fictional demo bookstore for testing product discovery.',
   'showroom', 'Books & Stationery', 'archive', 'Demo Floor 2 · Unit 205',
   'books@example.invalid', '+8801000000002', 'active'),
  ('demo-riverwear', 'Demo Riverwear', 'Casual clothing for every day',
   'Fictional demo fashion shop for testing categories and product cards.',
   'ecommerce', 'Fashion', 'archive', 'Demo Floor 3 · Unit 310',
   'fashion@example.invalid', '+8801000000003', 'active');

INSERT INTO products
  (tenantId, name, description, kind, category, priceCents, compareAtCents, stock, active)
SELECT t.id, p.name, p.description, p.kind, p.category, p.priceCents, p.compareAtCents, p.stock, TRUE
FROM tenants t
JOIN (
  SELECT 'demo-noor-electronics' AS slug, 'Demo Wireless Headphones' AS name,
    'Fictional demo product. No real brand or warranty is represented.' AS description,
    'product' AS kind, 'Audio' AS category, 249900 AS priceCents, 299900 AS compareAtCents, 24 AS stock
  UNION ALL
  SELECT 'demo-noor-electronics', 'Demo USB-C Charger',
    'Fictional demo charger listing for checkout and inventory UI testing.',
    'product', 'Accessories', 129900, NULL, 40
  UNION ALL
  SELECT 'demo-paper-tree', 'Demo Notebook Set',
    'Fictional stationery listing; suitable for catalogue and search demos.',
    'product', 'Stationery', 45000, NULL, 100
  UNION ALL
  SELECT 'demo-paper-tree', 'Demo Study Planner',
    'Fictional planner listing for testing product details.',
    'product', 'Stationery', 32000, 39000, 60
  UNION ALL
  SELECT 'demo-riverwear', 'Demo Cotton T-Shirt',
    'Fictional apparel listing; sizes and availability are illustrative.',
    'product', 'Clothing', 79900, NULL, 35
  UNION ALL
  SELECT 'demo-riverwear', 'Demo Canvas Tote',
    'Fictional accessory listing for marketplace browsing.',
    'product', 'Accessories', 55000, NULL, 50
) p ON p.slug = t.slug
WHERE NOT EXISTS (
  SELECT 1 FROM products existing
  WHERE existing.tenantId = t.id AND existing.name = p.name
);
