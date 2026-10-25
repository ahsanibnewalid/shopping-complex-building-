import { eq } from "drizzle-orm";
import { getDb } from "../api/queries/connection";
import * as schema from "./schema";

/**
 * Demo content so the marketplace is browsable on first run.
 * Idempotent: skips any tenant whose slug already exists.
 */
async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  const shops: {
    slug: string;
    name: string;
    tagline: string;
    description: string;
    businessType: "ecommerce" | "company" | "agency" | "showroom";
    category: string;
    themeId: string;
    location: string;
    plan: "starter" | "pro" | "business";
    products: {
      name: string;
      description: string;
      kind: "product" | "service";
      category: string;
      priceCents: number;
      stock: number;
    }[];
  }[] = [
    {
      slug: "noor-electronics",
      name: "Noor Electronics",
      tagline: "Gadgets, components and repairs",
      description:
        "A family-run electronics counter on the ground floor. Phones, audio, spare parts and honest repair quotes.",
      businessType: "ecommerce",
      category: "Electronics",
      themeId: "noir",
      location: "Unit G-04, Ground Floor",
      plan: "pro",
      products: [
        { name: "Aria Wireless Earbuds", description: "Noise-isolating earbuds, 30h battery, USB-C case.", kind: "product", category: "Electronics", priceCents: 5900, stock: 42 },
        { name: "Volt 65W GaN Charger", description: "Two USB-C + one USB-A. Charges a laptop and a phone at once.", kind: "product", category: "Electronics", priceCents: 3490, stock: 80 },
        { name: "Field Bluetooth Speaker", description: "IP67, 20h playtime, strap for bikes and backpacks.", kind: "product", category: "Electronics", priceCents: 7900, stock: 25 },
        { name: "Screen Repair — Phone", description: "Same-day screen replacement for most models. Quote before work begins.", kind: "service", category: "Services", priceCents: 4500, stock: 0 },
        { name: "Data Recovery Assessment", description: "Full diagnostic of dead drives and phones. Fee waived if unrecoverable.", kind: "service", category: "Services", priceCents: 2500, stock: 0 },
      ],
    },
    {
      slug: "atlas-thread",
      name: "Atlas & Thread",
      tagline: "Slow fashion, made to last",
      description:
        "Small-batch apparel in natural fabrics. Everything cut and sewn within fifty miles of the complex.",
      businessType: "ecommerce",
      category: "Fashion & Apparel",
      themeId: "lavender",
      location: "Unit 2-11, Second Floor",
      plan: "starter",
      products: [
        { name: "Heavyweight Pocket Tee", description: "320gsm organic cotton. Garment-dyed, pre-shrunk.", kind: "product", category: "Fashion & Apparel", priceCents: 3800, stock: 60 },
        { name: "Canvas Field Jacket", description: "Waxed canvas, corduroy collar, brass hardware.", kind: "product", category: "Fashion & Apparel", priceCents: 16800, stock: 12 },
        { name: "Merino Rib Socks — 3 Pack", description: "Mid-calf merino blend. One size, three earth tones.", kind: "product", category: "Fashion & Apparel", priceCents: 2400, stock: 120 },
        { name: "Selvedge Denim — Straight", description: "14oz Japanese selvedge. Chainstitched hems.", kind: "product", category: "Fashion & Apparel", priceCents: 14500, stock: 18 },
      ],
    },
    {
      slug: "harvest-table",
      name: "Harvest Table",
      tagline: "Groceries and pantry staples",
      description:
        "Dry goods, oils, spices and a rotating cheese counter. Order online, collect at the atrium kiosk.",
      businessType: "ecommerce",
      category: "Food & Grocery",
      themeId: "archive",
      location: "Atrium Kiosk K-2",
      plan: "starter",
      products: [
        { name: "Cold-Pressed Olive Oil 750ml", description: "Single-estate, first press. Peppery finish.", kind: "product", category: "Food & Grocery", priceCents: 1850, stock: 40 },
        { name: "Wildflower Honey 500g", description: "Raw and unfiltered, from rooftop hives.", kind: "product", category: "Food & Grocery", priceCents: 1200, stock: 35 },
        { name: "Spice Route Set — 6 Tins", description: "Smoked paprika, za'atar, garam masala and three more.", kind: "product", category: "Food & Grocery", priceCents: 2900, stock: 22 },
        { name: "Sourdough Starter Kit", description: "Live starter, flour blend, banneton and a printed guide.", kind: "product", category: "Food & Grocery", priceCents: 2100, stock: 15 },
      ],
    },
    {
      slug: "frame-and-field",
      name: "Frame & Field",
      tagline: "Furniture showroom and interiors",
      description:
        "A working showroom. Browse the floor pieces here, then visit to sit in them. Trade enquiries welcome.",
      businessType: "showroom",
      category: "Home & Furniture",
      themeId: "ledger",
      location: "Units 3-01 to 3-06, Third Floor",
      plan: "business",
      products: [
        { name: "Lowline Oak Lounge Chair", description: "Solid white oak, linen-blend cushion. Floor model available.", kind: "product", category: "Home & Furniture", priceCents: 89000, stock: 3 },
        { name: "Cantilever Desk 140cm", description: "Powder-coated steel frame, linoleum top. Flat-packed.", kind: "product", category: "Home & Furniture", priceCents: 52000, stock: 7 },
        { name: "Interior Consult — 1 Hour", description: "Walk your floor plan with our interiors lead, in-showroom or on video.", kind: "service", category: "Services", priceCents: 12000, stock: 0 },
        { name: "Full Room Scheme", description: "Moodboard, sourcing list and trade pricing for one room.", kind: "service", category: "Services", priceCents: 45000, stock: 0 },
      ],
    },
    {
      slug: "northlight-studio",
      name: "Northlight Studio",
      tagline: "Brand, web and campaign agency",
      description:
        "An eleven-person studio on the top floor. Identity systems, websites and launch campaigns for tenants and outsiders alike.",
      businessType: "agency",
      category: "Services",
      themeId: "archive",
      location: "Unit 5-02, Fifth Floor",
      plan: "pro",
      products: [
        { name: "Brand Identity Sprint", description: "Two-week identity package: wordmark, palette, type, usage sheet.", kind: "service", category: "Services", priceCents: 350000, stock: 0 },
        { name: "Storefront Website Build", description: "A five-page marketing site on your domain, launched in three weeks.", kind: "service", category: "Services", priceCents: 280000, stock: 0 },
        { name: "Product Photography Day", description: "One studio day, up to 30 SKUs shot and retouched.", kind: "service", category: "Services", priceCents: 90000, stock: 0 },
        { name: "Monthly Retainer — Small", description: "Eight design hours a month, priority turnaround.", kind: "service", category: "Services", priceCents: 120000, stock: 0 },
      ],
    },
    {
      slug: "paper-moon",
      name: "Paper Moon Books",
      tagline: "Independent bookshop and bindery",
      description:
        "New and second-hand books, stationery, and a bench bindery for repairs and custom journals.",
      businessType: "ecommerce",
      category: "Books & Stationery",
      themeId: "lavender",
      location: "Unit G-12, Ground Floor",
      plan: "starter",
      products: [
        { name: "Lay-Flat Notebook A5", description: "Thread-sewn, dotted 100gsm paper, cloth spine.", kind: "product", category: "Books & Stationery", priceCents: 1600, stock: 90 },
        { name: "Staff Picks Bundle — Fiction", description: "Three current staff favourites, wrapped.", kind: "product", category: "Books & Stationery", priceCents: 4200, stock: 20 },
        { name: "Brass Bookmark", description: "Hand-stamped solid brass, develops patina.", kind: "product", category: "Books & Stationery", priceCents: 950, stock: 150 },
        { name: "Book Repair & Rebinding", description: "Per-book quote for rebacking, recasing and page repair.", kind: "service", category: "Services", priceCents: 3000, stock: 0 },
      ],
    },
  ];

  for (const shop of shops) {
    const existing = await db
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, shop.slug))
      .limit(1);
    if (existing.length) {
      console.log(`skip ${shop.slug} (exists)`);
      continue;
    }

    const { products: items, plan, ...tenantData } = shop;
    const [result] = await db.insert(schema.tenants).values({
      ...tenantData,
      contactEmail: `hello@${shop.slug}.example.com`,
      phone: "+1 555 0100",
    });
    const tenantId = Number(result.insertId);
    await db.insert(schema.products).values(
      items.map((p) => ({ ...p, tenantId })),
    );
    const planDef = { starter: 150000, pro: 350000, business: 750000 }[plan];
    await db.insert(schema.subscriptions).values({
      tenantId,
      plan,
      monthlyCents: planDef,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    console.log(`seeded ${shop.slug}`);
  }

  console.log("Done.");
  process.exit(0);
}

seed();
