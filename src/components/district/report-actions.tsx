"use client";

import { useState } from "react";

export default function ReportActions({ reportId, status }: { reportId: string; status: "draft"|"submitted" }) {
  const [message, setMessage] = useState<string | null>(null);

  async function reopen() {
    const reason = window.prompt("Reopen reason (at least 10 characters)");
    if (!reason || reason.trim().length < 10) return;
    const response = await fetch("/api/reopen-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportId, reason }),
    });
    const body: { error?: string } = await response.json();
    setMessage(response.ok ? "Report reopened." : body.error ?? "Unable to reopen.");
  }

  return (
    <span className="flex items-center gap-2">
      <a href={`/api/exports/report/${reportId}/pdf`} className="rounded-xl border border-slate-300 px-3 py-2 dark:border-slate-700">PDF</a>
      {status === "submitted" ? <button onClick={() => void reopen()} className="rounded-xl border border-amber-700 px-3 text-amber-800 dark:text-amber-300">Reopen</button> : null}
      {message ? <span role="status">{message}</span> : null}
    </span>
  );
}
