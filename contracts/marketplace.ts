/**
 * Shared catalog of business types, storefront themes and subscription plans.
 * Consumed by both the tRPC API (validation) and the frontend (pickers,
 * theme rendering). Keep this file dependency-free.
 */

export const BUSINESS_TYPES = [
  {
    id: "ecommerce",
    label: "E-commerce Store",
    description: "Sell physical or digital products with cart and checkout.",
  },
  {
    id: "company",
    label: "Company / Brand",
    description: "Corporate presence with a product and service catalog.",
  },
  {
    id: "agency",
    label: "Agency",
    description: "Sell services, packages and retainers.",
  },
  {
    id: "showroom",
    label: "Showroom",
    description: "Display-only catalog; customers enquire instead of checkout.",
  },
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number]["id"];

export const SHOP_CATEGORIES = [
  "Electronics",
  "Fashion & Apparel",
  "Home & Furniture",
  "Beauty & Care",
  "Food & Grocery",
  "Books & Stationery",
  "Sports & Outdoor",
  "Jewellery & Watches",
  "Services",
  "General",
] as const;

/** A theme is a token set applied to a tenant storefront via CSS variables. */
export interface ThemeDef {
  id: string;
  name: string;
  description: string;
  tokens: {
    bg: string;
    surface: string;
    ink: string;
    muted: string;
    accent: string;
    accentInk: string;
    border: string;
    radius: string;
    displayFont: string;
    bodyFont: string;
    labelFont: string;
    dark: boolean;
  };
}

export const THEMES: ThemeDef[] = [
  {
    id: "archive",
    name: "Archive Mono",
    description: "Curatorial black-and-white index. Borders, grid, no noise.",
    tokens: {
      bg: "#ffffff",
      surface: "#f4f4f2",
      ink: "#111111",
      muted: "#6f6f6f",
      accent: "#111111",
      accentInk: "#ffffff",
      border: "#111111",
      radius: "0px",
      displayFont: "'Archivo', sans-serif",
      bodyFont: "'Newsreader', Georgia, serif",
      labelFont: "'DM Mono', monospace",
      dark: false,
    },
  },
  {
    id: "lavender",
    name: "Lavender Market",
    description: "Soft lavender floor, green cart badge, playful retail energy.",
    tokens: {
      bg: "#f8e7fe",
      surface: "#ffffff",
      ink: "#000000",
      muted: "#5c4a63",
      accent: "#6ae06a",
      accentInk: "#000000",
      border: "#000000",
      radius: "0px",
      displayFont: "'Archivo', sans-serif",
      bodyFont: "'Newsreader', Georgia, serif",
      labelFont: "'DM Mono', monospace",
      dark: false,
    },
  },
  {
    id: "noir",
    name: "Noir Showroom",
    description: "Midnight gallery with a mint signal. For premium showrooms.",
    tokens: {
      bg: "#0a0a1f",
      surface: "#01102e",
      ink: "#f5f7f2",
      muted: "#7a8292",
      accent: "#74f7b2",
      accentInk: "#01102e",
      border: "rgba(255,255,255,0.25)",
      radius: "14px",
      displayFont: "'Archivo', sans-serif",
      bodyFont: "'Newsreader', Georgia, serif",
      labelFont: "'DM Mono', monospace",
      dark: true,
    },
  },
  {
    id: "ledger",
    name: "Ledger Agency",
    description: "Editorial serif, paper ground, ink rules. Built for services.",
    tokens: {
      bg: "#f6f3ec",
      surface: "#ffffff",
      ink: "#1c1a16",
      muted: "#7d766a",
      accent: "#b6461d",
      accentInk: "#ffffff",
      border: "#1c1a16",
      radius: "0px",
      displayFont: "'Newsreader', Georgia, serif",
      bodyFont: "'Newsreader', Georgia, serif",
      labelFont: "'DM Mono', monospace",
      dark: false,
    },
  },
];

export const THEME_IDS = THEMES.map((t) => t.id) as [string, ...string[]];

export function getTheme(id: string): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export const PLANS = [
  {
    id: "starter",
    label: "Starter",
    monthlyCents: 1900,
    blurb: "1 staff seat, up to 50 listings, marketplace placement.",
  },
  {
    id: "pro",
    label: "Pro",
    monthlyCents: 4900,
    blurb: "5 staff seats, unlimited listings, featured placement.",
  },
  {
    id: "business",
    label: "Business",
    monthlyCents: 9900,
    blurb: "Unlimited staff, priority support, homepage spotlight.",
  },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];

export const TENANT_ROLES = ["owner", "manager", "staff"] as const;
export type TenantRole = (typeof TENANT_ROLES)[number];

export function formatMoney(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(cents / 100);
}
