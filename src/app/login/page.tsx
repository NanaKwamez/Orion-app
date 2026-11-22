import LoginForm from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-xl font-semibold text-[#0B1B3A] dark:text-sky-100">ORION Finance</h1>
        <p className="mt-1 text-slate-600 dark:text-slate-300">Sign in to your church finance account.</p>
        <LoginForm />
      </section>
    </main>
  );
}
