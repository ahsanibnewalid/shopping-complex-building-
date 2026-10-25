import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import {
  PLANS,
  THEMES,
  formatMoney,
  type TenantRole,
} from "@contracts/marketplace";

const TABS = ["Overview", "Products", "Orders", "Theme", "Team", "Billing"] as const;
type Tab = (typeof TABS)[number];

const emptyProduct = {
  name: "",
  description: "",
  kind: "product" as "product" | "service",
  category: "General",
  price: "",
  stock: "0",
  imageUrl: "",
  active: true,
};

export default function Dashboard() {
  const { user, isAuthenticated, isLoading } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => params.get("tab") === "Billing" ? "Billing" : "Overview");

  const utils = trpc.useUtils();
  const myShops = trpc.tenant.myShops.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const selectedId = Number(params.get("shop")) || null;
  const selected = useMemo(
    () =>
      myShops.data?.find((m) => m.tenant.id === selectedId) ??
      myShops.data?.[0] ??
      null,
    [myShops.data, selectedId],
  );

  useEffect(() => {
    const created = params.get("created");
    if (params.get("tab") === "Billing") setTab("Billing");
    else if (created) setTab("Products");
  }, [params]);

  if (isLoading || (isAuthenticated && myShops.isLoading)) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="micro-label text-[#777]">Loading your shops…</p>
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-dvh bg-white text-[#111]">
      <SiteHeader />
      <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="micro-label text-[#777]">Tenant admin panel</p>
            <h1 className="font-display mt-1 text-4xl font-black tracking-tight">
              {selected ? selected.tenant.name : "My shops"}
            </h1>
          </div>
          <Link to="/sell" className="btn-invert">+ Open another shop</Link>
        </div>

        {myShops.data && myShops.data.length > 1 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {myShops.data.map(({ tenant, member }) => (
              <button
                key={tenant.id}
                onClick={() => setParams({ shop: String(tenant.id) })}
                className={`micro-label cursor-pointer border border-[#111] px-3 py-2 transition-colors ${
                  selected?.tenant.id === tenant.id
                    ? "bg-[#111] text-white"
                    : "hover:bg-[#f4f4f2]"
                }`}
              >
                {tenant.name} · {member.role}
              </button>
            ))}
          </div>
        )}

        {!selected ? (
          <div className="mt-16 border border-[#111] p-10 text-center">
            <p className="font-display text-3xl font-black">No units yet.</p>
            <p className="font-serif-body mt-2 text-[#555]">
              Open your first shop to get an admin panel, a storefront and a spot
              in the directory.
            </p>
            <Link to="/sell" className="btn-invert mt-6 inline-block" data-variant="solid">
              Open a shop
            </Link>
          </div>
        ) : (
          <>
            <nav className="mt-8 flex flex-wrap border border-[#111]">
              {TABS.map((t, i) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`micro-label cursor-pointer px-4 py-3 ${
                    tab === t ? "bg-[#111] text-white" : "hover:bg-[#f4f4f2]"
                  } ${i > 0 ? "border-l border-[#111]" : ""}`}
                >
                  {t}
                </button>
              ))}
              <Link
                to={`/shops/${selected.tenant.slug}`}
                className="micro-label ml-auto px-4 py-3 underline underline-offset-4"
              >
                View storefront ↗
              </Link>
            </nav>

            <div className="mt-8">
              {tab === "Overview" && <OverviewTab tenantId={selected.tenant.id} role={selected.member.role} />}
              {tab === "Products" && <ProductsTab tenantId={selected.tenant.id} />}
              {tab === "Orders" && <OrdersTab tenantId={selected.tenant.id} />}
              {tab === "Theme" && (
                <ThemeTab tenantId={selected.tenant.id} current={selected.tenant.themeId}
                  onDone={() => utils.tenant.myShops.invalidate()} />
              )}
              {tab === "Team" && <TeamTab tenantId={selected.tenant.id} myRole={selected.member.role} myUserId={user.id} />}
              {tab === "Billing" && <BillingTab tenantId={selected.tenant.id} myRole={selected.member.role} />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------

function OverviewTab({ tenantId, role }: { tenantId: number; role: string }) {
  const products = trpc.tenant.listProducts.useQuery({ tenantId });
  const orders = trpc.tenant.listOrders.useQuery({ tenantId });
  const sub = trpc.tenant.subscription.useQuery({ tenantId });

  const newOrders = orders.data?.filter((o) => o.status === "new").length ?? 0;
  const revenue = orders.data
    ?.filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + o.totalCents, 0) ?? 0;

  const cards: [string, string | number][] = [
    ["Listings", products.data?.length ?? "—"],
    ["Active listings", products.data?.filter((p) => p.active).length ?? "—"],
    ["Orders", orders.data?.length ?? "—"],
    ["New orders", newOrders],
    ["Sales total", formatMoney(revenue)],
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {cards.map(([label, value]) => (
          <div key={label} className="border border-[#111] p-4">
            <p className="font-display text-2xl font-black">{value}</p>
            <p className="micro-label mt-1 text-[#777]">{label}</p>
          </div>
        ))}
      </div>
      <p className="micro-label mt-6 text-[#777]">
        Your role: {role}. Plan: {sub.data?.plan ?? "—"} — renews{" "}
        {sub.data ? new Date(sub.data.currentPeriodEnd).toLocaleDateString() : "—"}.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ProductsTab({ tenantId }: { tenantId: number }) {
  const utils = trpc.useUtils();
  const products = trpc.tenant.listProducts.useQuery({ tenantId });
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState(emptyProduct);

  const invalidate = () => utils.tenant.listProducts.invalidate({ tenantId });
  const createMut = trpc.tenant.createProduct.useMutation({ onSuccess: () => { invalidate(); setEditing(null); } });
  const updateMut = trpc.tenant.updateProduct.useMutation({ onSuccess: () => { invalidate(); setEditing(null); } });
  const deleteMut = trpc.tenant.deleteProduct.useMutation({ onSuccess: invalidate });

  const startEdit = (p?: {
    id: number; name: string; description: string | null; kind: "product" | "service";
    category: string | null; priceCents: number; stock: number; imageUrl: string | null; active: boolean;
  }) => {
    if (!p) {
      setForm(emptyProduct);
      setEditing("new");
    } else {
      setForm({
        name: p.name,
        description: p.description ?? "",
        kind: p.kind,
        category: p.category ?? "General",
        price: (p.priceCents / 100).toString(),
        stock: String(p.stock),
        imageUrl: p.imageUrl ?? "",
        active: p.active,
      });
      setEditing(p.id);
    }
  };

  const save = () => {
    const data = {
      name: form.name,
      description: form.description || undefined,
      kind: form.kind,
      category: form.category,
      priceCents: Math.round(parseFloat(form.price || "0") * 100),
      stock: parseInt(form.stock || "0", 10),
      imageUrl: form.imageUrl || undefined,
      active: form.active,
    };
    if (editing === "new") createMut.mutate({ tenantId, data });
    else if (typeof editing === "number") updateMut.mutate({ tenantId, productId: editing, data });
  };

  const input = "h-11 w-full border border-[#111] bg-white px-3 text-sm outline-none focus:bg-[#f4f4f2]";
  const busy = createMut.isPending || updateMut.isPending;
  const error = createMut.error ?? updateMut.error;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="font-display text-2xl font-black">Products & services</h2>
        <button onClick={() => startEdit()} className="btn-invert" data-variant="solid">
          + Add listing
        </button>
      </div>

      {editing !== null && (
        <div className="mb-8 border border-[#111] bg-[#f4f4f2] p-6">
          <p className="micro-label mb-4">{editing === "new" ? "New listing" : "Edit listing"}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={input} placeholder="Name *" value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <select className={input} value={form.kind}
              onChange={(e) => setForm({ ...form, kind: e.target.value as "product" | "service" })}
              aria-label="Kind">
              <option value="product">Product (stock tracked)</option>
              <option value="service">Service (bookable)</option>
            </select>
            <input className={input} placeholder="Price, e.g. 49.90 *" inputMode="decimal" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })} />
            <input className={input} placeholder="Category" value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })} />
            {form.kind === "product" && (
              <input className={input} placeholder="Stock" inputMode="numeric" value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            )}
            <input className={input} placeholder="Image URL (optional)" value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </div>
          <textarea
            className={`${input} mt-3 h-20 resize-none py-2`}
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <label className="micro-label mt-3 flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            Visible on the storefront
          </label>
          {error && <p className="micro-label mt-2 text-red-700">{error.message}</p>}
          <div className="mt-4 flex gap-3">
            <button onClick={save} disabled={busy || form.name.trim().length < 2 || !form.price}
              className="btn-invert" data-variant="solid">
              {busy ? "Saving…" : "Save"}
            </button>
            <button onClick={() => setEditing(null)} className="btn-invert">Cancel</button>
          </div>
        </div>
      )}

      {products.isLoading ? (
        <p className="micro-label text-[#777]">Loading…</p>
      ) : !products.data?.length ? (
        <p className="font-serif-body text-lg text-[#555]">
          No listings yet — add your first product or service.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[#111] text-left">
              <th className="micro-label py-2 pr-4 font-normal text-[#777]">Name</th>
              <th className="micro-label hidden py-2 pr-4 font-normal text-[#777] sm:table-cell">Kind</th>
              <th className="micro-label py-2 pr-4 font-normal text-[#777]">Price</th>
              <th className="micro-label hidden py-2 pr-4 font-normal text-[#777] sm:table-cell">Stock</th>
              <th className="micro-label hidden py-2 pr-4 font-normal text-[#777] md:table-cell">Status</th>
              <th className="micro-label py-2 text-right font-normal text-[#777]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.data.map((p) => (
              <tr key={p.id} className="border-b border-[#ddd]">
                <td className="py-3 pr-4 font-serif-body">{p.name}</td>
                <td className="micro-label hidden py-3 pr-4 capitalize sm:table-cell">{p.kind}</td>
                <td className="micro-label py-3 pr-4">{formatMoney(p.priceCents)}</td>
                <td className="micro-label hidden py-3 pr-4 sm:table-cell">
                  {p.kind === "service" ? "—" : p.stock}
                </td>
                <td className="micro-label hidden py-3 pr-4 md:table-cell">
                  {p.active ? "Live" : "Hidden"}
                </td>
                <td className="py-3 text-right">
                  <button onClick={() => startEdit(p)} className="micro-label cursor-pointer underline underline-offset-2">Edit</button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete "${p.name}"? This cannot be undone.`))
                        deleteMut.mutate({ tenantId, productId: p.id });
                    }}
                    className="micro-label ml-3 cursor-pointer text-red-700 underline underline-offset-2"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

const ORDER_STATUSES = ["new", "processing", "completed", "cancelled"] as const;

function OrdersTab({ tenantId }: { tenantId: number }) {
  const utils = trpc.useUtils();
  const orders = trpc.tenant.listOrders.useQuery({ tenantId });
  const setStatus = trpc.tenant.setOrderStatus.useMutation({
    onSuccess: () => utils.tenant.listOrders.invalidate({ tenantId }),
  });

  if (orders.isLoading) return <p className="micro-label text-[#777]">Loading…</p>;
  if (!orders.data?.length)
    return (
      <p className="font-serif-body text-lg text-[#555]">
        No orders yet. They land here the moment a customer checks out.
      </p>
    );

  return (
    <div className="space-y-4">
      {orders.data.map((o) => (
        <div key={o.id} className="border border-[#111]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#111] bg-[#f4f4f2] px-4 py-3">
            <p className="micro-label">
              #{o.id} · {new Date(o.createdAt).toLocaleString()} · {o.customerName}
            </p>
            <div className="flex items-center gap-3">
              <span className="micro-label">{formatMoney(o.totalCents)}</span>
              <select
                value={o.status}
                onChange={(e) =>
                  setStatus.mutate({
                    tenantId,
                    orderId: o.id,
                    status: e.target.value as (typeof ORDER_STATUSES)[number],
                  })
                }
                className="micro-label cursor-pointer border border-[#111] bg-white px-2 py-1"
                aria-label={`Status of order ${o.id}`}
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s} className="capitalize">{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="px-4 py-3">
            <ul className="space-y-1">
              {o.items.map((item) => (
                <li key={item.id} className="flex justify-between text-sm">
                  <span className="font-serif-body">{item.qty} × {item.name}</span>
                  <span className="micro-label">{formatMoney(item.priceCents * item.qty)}</span>
                </li>
              ))}
            </ul>
            <p className="micro-label mt-2 text-[#777]">
              {o.customerEmail}
              {o.customerPhone ? ` · ${o.customerPhone}` : ""}
              {o.note ? ` · “${o.note}”` : ""}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ThemeTab({
  tenantId,
  current,
  onDone,
}: {
  tenantId: number;
  current: string;
  onDone: () => void;
}) {
  const setTheme = trpc.tenant.setTheme.useMutation({ onSuccess: onDone });
  return (
    <div>
      <h2 className="font-display mb-2 text-2xl font-black">Storefront theme</h2>
      <p className="font-serif-body mb-6 text-[#555]">
        The theme skins your public storefront instantly. Switch any time.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => setTheme.mutate({ tenantId, themeId: t.id })}
            disabled={setTheme.isPending}
            className={`cursor-pointer border border-[#111] text-left transition-transform hover:scale-[1.01] ${
              current === t.id ? "ring-2 ring-[#111] ring-offset-2" : ""
            }`}
          >
            <div className="h-28 p-4" style={{ background: t.tokens.bg, color: t.tokens.ink }}>
              <p className="text-lg font-bold" style={{ fontFamily: t.tokens.displayFont }}>
                Your storefront
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
            <div className="flex items-center justify-between border-t border-[#111] p-4">
              <div>
                <p className="micro-label">{t.name}</p>
                <p className="font-serif-body mt-1 text-sm text-[#555]">{t.description}</p>
              </div>
              {current === t.id && <span className="micro-label">Active</span>}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function TeamTab({
  tenantId,
  myRole,
  myUserId,
}: {
  tenantId: number;
  myRole: TenantRole;
  myUserId: number;
}) {
  const utils = trpc.useUtils();
  const members = trpc.tenant.listMembers.useQuery({ tenantId });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"manager" | "staff">("staff");
  const invalidate = () => utils.tenant.listMembers.invalidate({ tenantId });
  const addMut = trpc.tenant.addMember.useMutation({
    onSuccess: () => { invalidate(); setEmail(""); },
  });
  const roleMut = trpc.tenant.setMemberRole.useMutation({ onSuccess: invalidate });
  const removeMut = trpc.tenant.removeMember.useMutation({ onSuccess: invalidate });

  const isOwner = myRole === "owner";
  const input = "h-11 border border-[#111] bg-white px-3 text-sm outline-none focus:bg-[#f4f4f2]";

  return (
    <div>
      <h2 className="font-display mb-2 text-2xl font-black">Team & roles</h2>
      <p className="font-serif-body mb-6 text-[#555]">
        Owners control billing and the team. Managers manage products and
        themes. Staff handle products and orders.
      </p>

      {isOwner && (
        <form
          className="mb-8 flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            addMut.mutate({ tenantId, email, role });
          }}
        >
          <input
            required
            type="email"
            placeholder="Teammate's sign-in email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${input} flex-1`}
          />
          <select value={role} onChange={(e) => setRole(e.target.value as "manager" | "staff")}
            className={`${input} cursor-pointer`} aria-label="Role">
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
          </select>
          <button type="submit" disabled={addMut.isPending} className="btn-invert" data-variant="solid">
            Add to team
          </button>
        </form>
      )}
      {addMut.error && <p className="micro-label mb-4 text-red-700">{addMut.error.message}</p>}

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[#111] text-left">
            <th className="micro-label py-2 pr-4 font-normal text-[#777]">Member</th>
            <th className="micro-label py-2 pr-4 font-normal text-[#777]">Role</th>
            {isOwner && <th className="micro-label py-2 text-right font-normal text-[#777]">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {members.data?.map(({ member, user }) => (
            <tr key={member.id} className="border-b border-[#ddd]">
              <td className="py-3 pr-4">
                <p className="font-serif-body">{user.name ?? "Unnamed"}</p>
                <p className="micro-label text-[#777]">{user.email}</p>
              </td>
              <td className="py-3 pr-4">
                {isOwner && user.id !== myUserId ? (
                  <select
                    value={member.role}
                    onChange={(e) =>
                      roleMut.mutate({
                        tenantId,
                        memberId: member.id,
                        role: e.target.value as TenantRole,
                      })
                    }
                    className="micro-label cursor-pointer border border-[#111] bg-white px-2 py-1 capitalize"
                    aria-label={`Role for ${user.email}`}
                  >
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                ) : (
                  <span className="micro-label capitalize">{member.role}{user.id === myUserId ? " (you)" : ""}</span>
                )}
              </td>
              {isOwner && (
                <td className="py-3 text-right">
                  {user.id !== myUserId && (
                    <button
                      onClick={() =>
                        window.confirm(`Remove ${user.email} from the team?`) &&
                        removeMut.mutate({ tenantId, memberId: member.id })
                      }
                      className="micro-label cursor-pointer text-red-700 underline underline-offset-2"
                    >
                      Remove
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------

function BillingTab({ tenantId, myRole }: { tenantId: number; myRole: TenantRole }) {
  const sub = trpc.tenant.subscription.useQuery({ tenantId });
  const payMut = trpc.tenant.initiateSubscriptionPayment.useMutation({
    onSuccess: ({ gatewayUrl }) => window.location.assign(gatewayUrl),
    onError: (error) => window.alert(error.message),
  });

  const startCheckout = (plan: (typeof PLANS)[number]["id"]) => {
    const customerName = window.prompt("Name for your payment receipt")?.trim();
    if (!customerName) return;
    const customerEmail = window.prompt("Email for your payment receipt")?.trim();
    if (!customerEmail) return;
    const customerPhone = window.prompt("Bangladesh mobile number for payment")?.trim();
    if (!customerPhone) return;
    payMut.mutate({ tenantId, plan, months: 1, customerName, customerEmail, customerPhone });
  };

  if (sub.isLoading) return <p className="micro-label text-[#777]">Loading…</p>;
  if (!sub.data) return <p className="font-serif-body text-[#555]">No subscription on record.</p>;

  const s = sub.data;
  const overdue = new Date(s.currentPeriodEnd).getTime() < Date.now();
  const isOwner = myRole === "owner";

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="border border-[#111] p-6">
        <p className="micro-label text-[#777]">Current subscription</p>
        <p className="font-display mt-2 text-4xl font-black capitalize">{s.plan}</p>
        <p className="font-display mt-1 text-2xl">{formatMoney(s.monthlyCents)}/mo</p>
        <p className={`micro-label mt-4 ${overdue || s.status !== "active" ? "text-red-700" : "text-[#777]"}`}>
          {s.status === "active" && !overdue
            ? `Paid through ${new Date(s.currentPeriodEnd).toLocaleDateString()}`
            : "Payment due — the storefront is not published until payment is verified."}
        </p>
        {isOwner && (
          <button
            onClick={() => startCheckout(s.plan)}
            disabled={payMut.isPending}
            className="btn-invert mt-6"
            data-variant="solid"
          >
            {payMut.isPending ? "Opening secure checkout…" : `Pay ${formatMoney(s.monthlyCents)} — 1 month`}
          </button>
        )}
      </div>

      <div className="border border-[#111] p-6">
        <p className="micro-label text-[#777]">Choose a plan</p>
        <div className="mt-4 space-y-2">
          {PLANS.map((p) => (
            <button
              key={p.id}
              disabled={!isOwner || payMut.isPending}
              onClick={() => startCheckout(p.id)}
              className={`flex w-full cursor-pointer items-center justify-between border border-[#111] px-4 py-3 text-left transition-colors ${
                p.id === s.plan ? "bg-[#111] text-white" : "hover:bg-[#f4f4f2] disabled:opacity-60"
              }`}
            >
              <span className="micro-label">{p.label}{p.id === s.plan ? " · Current" : ""}</span>
              <span className="micro-label">{formatMoney(p.monthlyCents)}/mo</span>
            </button>
          ))}
        </div>
        <p className="micro-label mt-4 text-[#777]">
          Checkout opens on SSLCommerz. The selected plan activates only after server-side payment verification.
        </p>
      </div>

      <div className="border border-[#111] p-6 lg:col-span-2">
        <p className="micro-label mb-4 text-[#777]">Payment history</p>
        {s.payments.length === 0 ? (
          <p className="font-serif-body text-[#555]">No payments recorded yet.</p>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {s.payments.map((p) => (
                <tr key={p.id} className="border-b border-[#ddd]">
                  <td className="micro-label py-2 pr-4">{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : "Pending"}</td>
                  <td className="micro-label py-2 pr-4">{p.months} mo</td>
                  <td className="py-2 pr-4 font-serif-body text-sm">{p.note}</td>
                  <td className="micro-label py-2 pr-4">{p.status}</td>
                  <td className="micro-label py-2 text-right">{formatMoney(p.amountCents, p.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
