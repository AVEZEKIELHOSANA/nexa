export function AuthLayout({
  title, subtitle, children, footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="min-h-[calc(100vh-4rem)] bg-[#F9F9F6] flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 sm:p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-stone-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-stone-600">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>
        {footer && <div className="mt-4 text-center text-sm text-stone-600">{footer}</div>}
      </div>
    </main>
  );
}