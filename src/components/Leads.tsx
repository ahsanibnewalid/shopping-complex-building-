import { useState } from "react";
import { trpc } from "@/providers/trpc";

const statuses = ["new", "contacted", "proposal_sent", "closed"] as const;
export function LeadsPanel({ tenantId }: { tenantId: number }) {
  const utils = trpc.useUtils();
  const leads = trpc.leads.list.useQuery({ tenantId });
  const update = trpc.leads.setStatus.useMutation({
    onSuccess: () => utils.leads.list.invalidate({ tenantId }),
  });
  return <section>
    <h2 className="font-display mb-6 text-2xl font-black">Customer inquiries</h2>
    {leads.isLoading && <p>Loading inquiries…</p>}
    {leads.error && <p role="alert" className="text-red-700">{leads.error.message}</p>}
    {!leads.isLoading && !leads.data?.length && <p>No inquiries yet.</p>}
    <div className="space-y-4">
      {leads.data?.map(lead => <article key={lead.id} className="border border-[#111] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold">{lead.name}</h3>
            <a className="underline" href={`mailto:${lead.email}`}>{lead.email}</a>
            {lead.phone && <p>{lead.phone}</p>}
            <p className="mt-3 whitespace-pre-wrap">{lead.message}</p>
            <p className="mt-3 text-xs text-[#777]">{new Date(lead.createdAt).toLocaleString()}</p>
          </div>
          <label className="text-sm">Status
            <select aria-label={`Status for ${lead.name}`} className="ml-2 border border-[#111] p-2"
              value={lead.status} disabled={update.isPending}
              onChange={e => update.mutate({ tenantId, leadId: lead.id, status: e.target.value as typeof statuses[number] })}>
              {statuses.map(status => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
            </select>
          </label>
        </div>
      </article>)}
    </div>
    {update.error && <p role="alert" className="mt-3 text-red-700">{update.error.message}</p>}
  </section>;
}

export function InquiryForm({ shopSlug }: { shopSlug: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const submit = trpc.leads.submit.useMutation();
  return <section className="mt-12 border-t py-8">
    <h2 className="text-2xl font-bold">Request a consultation</h2>
    {submit.isSuccess ? <p role="status" className="mt-4">Inquiry sent successfully.</p> :
      <form className="mt-5 grid max-w-xl gap-3" onSubmit={e => {
        e.preventDefault();
        submit.mutate({ shopSlug, name, email, phone: phone || undefined, message });
      }}>
        <input className="border p-3" aria-label="Your name" required minLength={2} maxLength={255} placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} />
        <input className="border p-3" aria-label="Email" type="email" required placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input className="border p-3" aria-label="Phone (optional)" maxLength={60} placeholder="Phone (optional)" value={phone} onChange={e=>setPhone(e.target.value)} />
        <textarea className="border p-3" aria-label="Project or service inquiry" required minLength={10} maxLength={5000} rows={5} placeholder="Tell us what you need" value={message} onChange={e=>setMessage(e.target.value)} />
        {submit.error && <p role="alert" className="text-red-700">{submit.error.message}</p>}
        <button className="border bg-black p-3 text-white" disabled={submit.isPending} type="submit">{submit.isPending ? "Sending…" : "Send inquiry"}</button>
      </form>}
  </section>;
}
