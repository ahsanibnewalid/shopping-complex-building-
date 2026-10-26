import { useState } from "react";
import { trpc } from "@/providers/trpc";
const statuses = ["requested","confirmed","completed","cancelled"] as const;
export function BookingsPanel({tenantId}:{tenantId:number}) {
 const utils=trpc.useUtils();
 const bookings=trpc.bookings.list.useQuery({tenantId});
 const update=trpc.bookings.setStatus.useMutation({onSuccess:()=>utils.bookings.list.invalidate({tenantId})});
 return <section><h2 className="mb-6 text-2xl font-bold">Service bookings</h2>
  {bookings.isLoading && <p>Loading bookings…</p>}
  {bookings.error && <p role="alert">{bookings.error.message}</p>}
  {!bookings.isLoading && !bookings.data?.length && <p>No booking requests yet.</p>}
  <div className="space-y-3">{bookings.data?.map(b=><article key={b.id} className="border p-4">
   <p className="font-semibold">{b.customerName} · {new Date(b.startsAt).toLocaleString()}</p>
   <a href={`mailto:${b.customerEmail}`} className="underline">{b.customerEmail}</a>
   {b.customerPhone && <p>{b.customerPhone}</p>}
   {b.note && <p className="my-2 whitespace-pre-wrap">{b.note}</p>}
   <select className="mt-2 border p-2" aria-label={`Booking status for ${b.customerName}`} value={b.status}
    disabled={update.isPending} onChange={e=>update.mutate({tenantId,bookingId:b.id,status:e.target.value as typeof statuses[number]})}>
    {statuses.map(s=><option key={s} value={s}>{s}</option>)}
   </select>
  </article>)}</div>{update.error && <p role="alert">{update.error.message}</p>}
 </section>;
}
export function BookingForm({shopSlug,services}:{shopSlug:string;services:{id:number;name:string}[]}) {
 const [serviceId,setServiceId]=useState(services[0]?.id ?? 0);
 const [customerName,setCustomerName]=useState("");
 const [customerEmail,setCustomerEmail]=useState("");
 const [startsAt,setStartsAt]=useState("");
 const [note,setNote]=useState("");
 const request=trpc.bookings.request.useMutation();
 if(!services.length)return null;
 return <section className="mt-12 border-t py-8"><h2 className="text-2xl font-bold">Request an appointment</h2>
  {request.isSuccess?<p role="status">Booking request received. The business must confirm your appointment.</p>:
   <form className="mt-4 grid max-w-xl gap-3" onSubmit={e=>{
    e.preventDefault();const date=new Date(startsAt);if(Number.isNaN(date.getTime()))return;
    request.mutate({shopSlug,serviceId,customerName,customerEmail,startsAt:date,note:note||undefined});
   }}>
    <label>Service<select className="block w-full border p-3" value={serviceId} onChange={e=>setServiceId(Number(e.target.value))}>
     {services.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
    <input required className="border p-3" aria-label="Name" placeholder="Name" minLength={2} value={customerName} onChange={e=>setCustomerName(e.target.value)}/>
    <input required type="email" className="border p-3" aria-label="Email" placeholder="Email" value={customerEmail} onChange={e=>setCustomerEmail(e.target.value)}/>
    <label>Preferred date and time<input required type="datetime-local" className="block w-full border p-3" value={startsAt} onChange={e=>setStartsAt(e.target.value)}/></label>
    <textarea className="border p-3" aria-label="Notes" placeholder="Additional details" maxLength={2000} value={note} onChange={e=>setNote(e.target.value)}/>
    {request.error && <p role="alert" className="text-red-700">{request.error.message}</p>}
    <button disabled={request.isPending||!serviceId} className="border bg-black p-3 text-white" type="submit">{request.isPending?"Sending…":"Request booking"}</button>
   </form>}
 </section>;
}
