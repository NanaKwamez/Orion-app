export const dynamic = "force-dynamic";
import { getAuthenticatedProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function ConferenceAuditPage() {
  const { profile, error } = await getAuthenticatedProfile();
  if (error) return <p role="alert">{error}</p>;
  if (!profile) return null;
  const supabase = await createClient();
  const { data: logs, error: dataError } = await supabase
    .from("audit_logs")
    .select("id, actor_role, action, entity_type, entity_id, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (dataError) return <p role="alert" className="text-red-700">Unable to load audit log.</p>;
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold">Audit log</h2>
      {logs?.length ? <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">{logs.map((log) =>
        <div key={log.id} className="py-3"><strong>{log.action}</strong><p className="text-slate-600 dark:text-slate-300">{log.actor_role ?? "system"} · {new Date(log.created_at).toLocaleString("en-GH")}</p></div>
      )}</div> : <p className="mt-4">No audit events.</p>}
    </section>
  );
}
