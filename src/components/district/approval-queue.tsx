"use client";

import { useState } from "react";

type Request = {
  id: string;
  church_id: string;
  member_id: string | null;
  request_type: "add"|"withdraw";
  reason: string;
  status: "pending";
  requested_at: string;
};

export default function ApprovalQueue({ initialRequests }: { initialRequests: Request[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [message, setMessage] = useState<string | null>(null);

  async function review(id: string, approve: boolean, note: string) {
    setMessage(null);
    const response = await fetch("/api/district/review-member-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId: id, approve, note }),
    });
    const body: { error?: string } = await response.json();
    if (!response.ok) setMessage(body.error ?? "Unable to review request.");
    else {
      setRequests((current) => current.filter((request) => request.id !== id));
      setMessage("Request reviewed.");
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="font-semibold">Pending approvals</h2>
      {message ? <p role="alert" className="mt-3">{message}</p> : null}
      {requests.length ? <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">{requests.map((request) =>
        <RequestCard key={request.id} request={request} onReview={review} />
      )}</div> : <p className="mt-3">No pending requests.</p>}
    </section>
  );
}

function RequestCard({ request, onReview }: { request: Request; onReview: (id: string, approve: boolean, note: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  return (
    <div className="py-4">
      <strong>{request.request_type === "add" ? "Add member" : "Withdraw member"}</strong>
      <p className="mt-1 text-slate-600 dark:text-slate-300">{request.reason}</p>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Review note" className="mt-3 w-full rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-950" />
      <div className="mt-3 flex gap-2"><button onClick={() => void onReview(request.id, true, note)} className="rounded-xl bg-green-700 px-4 text-white">Approve</button><button onClick={() => void onReview(request.id, false, note)} className="rounded-xl border border-red-700 px-4 text-red-700 dark:text-red-300">Reject</button></div>
    </div>
  );
}
