import AppShell from "@/components/layout/app-shell";

export default function ConferenceLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="conference" title="Conference">{children}</AppShell>;
}
