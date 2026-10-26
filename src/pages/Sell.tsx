import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  BUSINESS_TYPES,
  PLANS,
  SHOP_CATEGORIES,
  THEMES,
  formatMoney,
} from "@contracts/marketplace";

const STEPS = ["Business type", "Shop profile", "Theme", "Plan"] as const;

/** Tenant onboarding: pick a type, describe the shop, choose a theme + plan. */
export default function Sell() {
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const createShop = trpc.tenant.createShop.useMutation({
    onSuccess: ({ slug }) => navigate(`/dashboard?created=${slug}&tab=Billing`),
  });

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    businessType: "" as string,
    name: "",
    tagline: "",
    description: "",
    category: "General",
    location: "",
    contactEmail: "",
    phone: "",
    themeId: "archive",
    plan: "starter" as string,
  });

  const canNext =
    (step === 0 && !!form.businessType) ||
    (step === 1 && form.name.trim().length >= 2) ||
    step === 2 ||
    step === 3;

  const input =
    "h-12 w-full border border-[#111] bg-white px-4 text-base outline-none focus:bg-[#f4f4f2]";

  return (
    <div className="min-h-dvh bg-white text-[#111]">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-14 sm:px-8">
        <p className="micro-label text-[#777]">Become a tenant</p>
        <h1 className="font-display mt-2 text-5xl font-black tracking-tight">
          Open your unit
        </h1>

        {/* Stepper */}
        <ol className="mt-8 flex border border-[#111]">
          {STEPS.map((label, i) => (
            <li
              key={label}
              className={`micro-label flex-1 px-2 py-3 text-center ${
                i === step
                  ? "bg-[#111] text-white"
                  : i < step
                    ? "bg-[#f4f4f2] text-[#111]"
                    : "text-[#999]"
              } ${i > 0 ? "border-l border-[#111]" : ""}`}
            >
              {label}
            </li>
          ))}
        </ol>

        <div className="mt-10 min-h-[320px]">
          {step === 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {BUSINESS_TYPES.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setForm({ ...form, businessType: b.id })}
                  className={`cursor-pointer border border-[#111] p-6 text-left transition-colors ${
                    form.businessType === b.id ? "bg-[#111] text-white" : "hover:bg-[#f4f4f2]"
                  }`}
                >
                  <p className="micro-label">{b.label}</p>
                  <p className={`font-serif-body mt-2 text-sm ${form.businessType === b.id ? "text-[#ccc]" : "text-[#555]"}`}>
                    {b.description}
                  </p>
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <input className={input} placeholder="Shop name *" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input className={input} placeholder="Tagline" value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
              <textarea
                className={`${input} h-28 resize-none py-3`}
                placeholder="What do you sell? (shown on your storefront)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <select
                  className={input}
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  aria-label="Category"
                >
                  {SHOP_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input className={input} placeholder="Unit / floor location" value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })} />
                <input className={input} type="email" placeholder="Public contact email" value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
                <input className={input} placeholder="Phone" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setForm({ ...form, themeId: t.id })}
                  className={`cursor-pointer border border-[#111] text-left transition-transform hover:scale-[1.01] ${
                    form.themeId === t.id ? "ring-2 ring-[#111] ring-offset-2" : ""
                  }`}
                >
                  <div className="h-28 p-4" style={{ background: t.tokens.bg, color: t.tokens.ink }}>
                    <p className="text-lg font-bold" style={{ fontFamily: t.tokens.displayFont }}>
                      {form.name || "Your Shop"}
                    </p>
                    <span
                      className="mt-2 inline-block px-2 py-1 text-[10px] uppercase tracking-widest"
                      style={{
                        background: t.tokens.accent,
                        color: t.tokens.accentInk,
                        fontFamily: t.tokens.labelFont,
                        borderRadius: t.tokens.radius,
                      }}
                    >
                      Add to cart
                    </span>
                  </div>
                  <div className="border-t border-[#111] p-4">
                    <p className="micro-label">{t.name}</p>
                    <p className="font-serif-body mt-1 text-sm text-[#555]">{t.description}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setForm({ ...form, plan: p.id })}
                  className={`cursor-pointer border border-[#111] p-6 text-left transition-colors ${
                    form.plan === p.id ? "bg-[#111] text-white" : "hover:bg-[#f4f4f2]"
                  }`}
                >
                  <p className="micro-label">{p.label}</p>
                  <p className="font-display mt-3 text-3xl font-black">
                    {formatMoney(p.monthlyCents)}
                    <span className="text-sm font-normal">/mo</span>
                  </p>
                  <p className={`font-serif-body mt-2 text-sm ${form.plan === p.id ? "text-[#ccc]" : "text-[#555]"}`}>
                    {p.blurb}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {createShop.error && (
          <p className="micro-label mt-4 text-red-700">{createShop.error.message}</p>
        )}

        <div className="mt-8 flex justify-between">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="btn-invert"
          >
            ← Back
          </button>
          {step < 3 ? (
            <button
              onClick={() => canNext && setStep(step + 1)}
              disabled={!canNext}
              className="btn-invert"
              data-variant="solid"
            >
              Continue →
            </button>
          ) : isAuthenticated ? (
            <button
              onClick={() =>
                createShop.mutate({
                  name: form.name,
                  tagline: form.tagline || undefined,
                  description: form.description || undefined,
                  businessType: form.businessType as never,
                  category: form.category,
                  themeId: form.themeId,
                  location: form.location || undefined,
                  contactEmail: form.contactEmail || undefined,
                  phone: form.phone || undefined,
                  plan: form.plan as never,
                })
              }
              disabled={createShop.isPending}
              className="btn-invert"
              data-variant="solid"
            >
              {createShop.isPending ? "Opening…" : "Continue to billing"}
            </button>
          ) : (
            <Link to="/login" className="btn-invert" data-variant="solid">
              {isLoading ? "…" : `Sign in to open (${user ? "" : "required"})`}
            </Link>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
