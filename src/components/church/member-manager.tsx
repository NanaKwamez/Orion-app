"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

type Member = {
  id: string;
  full_name: string;
  phone: string | null;
  gender: "male"|"female"|"other"|null;
  member_number: string | null;
  status: "pending_add"|"active"|"pending_withdrawal"|"withdrawn"|"rejected";
};

export default function MemberManager({ churchId, initialMembers }: { churchId: string; initialMembers: Member[] }) {
  const [members, setMembers] = useState(initialMembers);
  const [message, setMessage] = useState<string | null>(null);

  async function requestAdd(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/church/request-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        churchId,
        fullName: String(form.get("fullName") ?? ""),
        phone: String(form.get("phone") ?? "") || undefined,
        gender: String(form.get("gender") ?? "") || undefined,
        memberNumber: String(form.get("memberNumber") ?? "") || undefined,
        reason: String(form.get("reason") ?? ""),
      }),
    });
    const body: { error?: string } = await response.json();
    if (!response.ok) setMessage(body.error ?? "Unable to submit add request.");
    else {
      event.currentTarget.reset();
      setMessage("Add request submitted for district approval.");
    }
  }

  async function requestWithdrawal(member: Member) {
    const reason = window.prompt("Reason for withdrawal (at least 10 characters)");
    if (!reason || reason.trim().length < 10) return;
    setMessage(null);
    const response = await fetch("/api/church/request-withdrawal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: member.id, reason }),
    });
    const body: { error?: string } = await response.json();
    if (!response.ok) setMessage(body.error ?? "Unable to submit withdrawal.");
    else {
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, status: "pending_withdrawal" } : item));
      setMessage("Withdrawal request submitted.");
    }
  }

  async function fixSpelling(member: Member, fullName: string) {
    if (fullName.trim().length < 2) return;
    const supabase = createClient();
    const { error } = await supabase.from("members").update({ full_name: fullName.trim() }).eq("id", member.id);
    if (error) setMessage("Unable to update member name.");
    else {
      setMembers((current) => current.map((item) => item.id === member.id ? { ...item, full_name: fullName.trim() } : item));
    }
  }

  return (
    <div className="space-y-4">
      {message ? <p role="alert" className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">{message}</p> : null}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Request member add</h2>
        <form onSubmit={requestAdd} className="mt-4 grid gap-3 sm:grid-cols-3">
          <input name="fullName" required placeholder="Full name" className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
          <input name="phone" placeholder="Phone (optional)" className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
          <select name="gender" className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950"><option value="">Gender (optional)</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select>
          <input name="memberNumber" placeholder="Member number (optional)" className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
          <textarea name="reason" required minLength={10} placeholder="Reason for add request" className="min-h-24 rounded-xl border border-slate-300 px-3 py-2 sm:col-span-2 dark:border-slate-700 dark:bg-slate-950" />
          <button className="rounded-xl bg-[#0B1B3A] px-4 text-white">Submit request</button>
        </form>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Members</h2>
        {members.length ? <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-800">{members.map((member) =>
          <MemberCard key={member.id} member={member} onFix={fixSpelling} onWithdraw={requestWithdrawal} />
        )}</div> : <p className="mt-3">No members.</p>}
      </section>
    </div>
  );
}

function MemberCard({ member, onFix, onWithdraw }: {
  member: Member;
  onFix: (member: Member, name: string) => Promise<void>;
  onWithdraw: (member: Member) => Promise<void>;
}) {
  const [name, setName] = useState(member.full_name);
  const canFix = member.status !== "withdrawn";
  return (
    <div className="py-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        <input value={name} onChange={(event) => setName(event.target.value)} disabled={!canFix} className="rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-950" />
        <span className="flex items-center">{member.status}{member.member_number ? ` · ${member.member_number}` : ""}</span>
        {canFix ? <button onClick={() => void onFix(member, name)} className="rounded-xl border border-slate-300 px-3 dark:border-slate-700">Fix spelling</button> : null}
        {member.status === "active" ? <button onClick={() => void onWithdraw(member)} className="rounded-xl border border-red-700 px-3 text-red-700 dark:text-red-300">Withdraw</button> : null}
      </div>
    </div>
  );
}
