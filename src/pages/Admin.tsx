import { Link, useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import { useAuth } from "@/hooks/useAuth";
import { SiteHeader } from "@/components/SiteHeader";
import { formatMoney } from "@contracts/marketplace";

/** Complex-owner console: platform stats, tenant lifecycle, billing. */
export default function Admin() {
  const { user, isAuthenticated, isLoading } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  const isAdmin = user?.role === "admin";
  const overview = trpc.admin.overview.useQuery(undefined, { enabled: isAdmin });
  const tenants = trpc.admin.tenants.useQuery(undefined, { enabled: isAdmin });

  const invalidate = () => {
    utils.admin.tenants.invalidate();
    utils.admin.overview.invalidate();
  };
  const statusMut = trpc.admin.setTenantStatus.useMutation({ onSuccess: invalidate });
  const subMut = trpc.admin.setSubscriptionStatus.useMutation({ onSuccess: invalidate });
  const payMut = trpc.admin.recordPayment.useMutation({ onSuccess: invalidate });

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white">
        <p className="micro-label text-[#777]">Loading…</p>
      </div>
    );
  }
  if (!isAuthenticated) return null;
  if (!isAdmin) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-white">
        <p className="font-display text-3xl font-black">Complex office only.</p>
        <p className="font-serif-body text-[#555]">
          This console is for the shopping-complex owner. You're signed in as a tenant.
        </p>
        <button onClick={() => navigate("/dashboard")} className="btn-invert">
          Go to my shops
        </button>
      </div>
    );
  }

  const o = overview.data;
  const cards: [string, string | number][] = [
    ["Tenants", o?.tenants ?? "—"],
    ["Active tenants", o?.activeTenants ?? "—"],
    ["Registered users", o?.users ?? "—"],
    ["Listings", o?.products ?? "—"],
    ["Orders", o?.orders ?? "—"],
    ["MRR", o ? formatMoney(o.mrr) : "—"],
    ["Billing collected", o ? formatMoney(o.revenue) : "—"],
  ];

  return (
    <div className="min-h-dvh bg-white text-[#111]">
      <SiteHeader />
      <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-8">
        <p className="micro-label text-[#777]">Complex owner console</p>
        <h1 className="font-display mt-1 text-4xl font-black tracking-tight">
          Building management
        </h1>

        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {cards.map(([label, value]) => (
            <div key={label} className="border border-[#111] p-4">
              <p className="font-display text-xl font-black">{value}</p>
              <p className="micro-label mt-1 text-[#777]">{label}</p>
            </div>
          ))}
        </div>

        <h2 className="font-display mb-4 mt-12 text-2xl font-black">Tenants</h2>
        {tenants.isLoading ? (
          <p className="micro-label text-[#777]">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#111] text-left">
                  <th className="micro-label py-2 pr-4 font-normal text-[#777]">Shop</th>
                  <th className="micro-label hidden py-2 pr-4 font-normal text-[#777] md:table-cell">Owner</th>
                  <th className="micro-label py-2 pr-4 font-normal text-[#777]">Plan</th>
                  <th className="micro-label hidden py-2 pr-4 font-normal text-[#777] sm:table-cell">Paid through</th>
                  <th className="micro-label py-2 pr-4 font-normal text-[#777]">Status</th>
                  <th className="micro-label py-2 text-right font-normal text-[#777]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.data?.map(({ tenant, subscription, ownerName, ownerEmail }) => (
                  <tr key={tenant.id} className="border-b border-[#ddd]">
                    <td className="py-3 pr-4">
                      <Link to={`/shops/${tenant.slug}`} className="font-serif-body underline underline-offset-2">
                        {tenant.name}
                      </Link>
                      <p className="micro-label capitalize text-[#777]">
                        {tenant.businessType} · {tenant.category}
                      </p>
                    </td>
                    <td className="hidden py-3 pr-4 md:table-cell">
                      <p className="font-serif-body text-sm">{ownerName ?? "—"}</p>
                      <p className="micro-label text-[#777]">{ownerEmail}</p>
                    </td>
                    <td className="micro-label py-3 pr-4 capitalize">
                      {subscription?.plan ?? "—"}
                      <span className="text-[#777]">
                        {" "}
                        {subscription ? formatMoney(subscription.monthlyCents) : ""}
                      </span>
                    </td>
                    <td className="micro-label hidden py-3 pr-4 sm:table-cell">
                      {subscription
                        ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`micro-label border border-[#111] px-2 py-1 ${
                          tenant.status === "active" ? "bg-[#6ae06a]" : "bg-red-200"
                        }`}
                      >
                        {tenant.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() =>
                          statusMut.mutate({
                            tenantId: tenant.id,
                            status: tenant.status === "active" ? "suspended" : "active",
                          })
                        }
                        className="micro-label cursor-pointer underline underline-offset-2"
                      >
                        {tenant.status === "active" ? "Suspend" : "Reactivate"}
                      </button>
                      <button
                        onClick={() =>
                          payMut.mutate({ tenantId: tenant.id, months: 1 })
                        }
                        className="micro-label ml-3 cursor-pointer underline underline-offset-2"
                      >
                        +1 mo paid
                      </button>
                      {subscription && subscription.status !== "past_due" && (
                        <button
                          onClick={() =>
                            subMut.mutate({ tenantId: tenant.id, status: "past_due" })
                          }
                          className="micro-label ml-3 cursor-pointer text-red-700 underline underline-offset-2"
                        >
                          Mark due
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
