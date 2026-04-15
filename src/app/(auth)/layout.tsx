export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="app-shell flex min-h-screen items-center justify-center px-6 py-12">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-xl border border-border bg-surface lg:grid-cols-[1fr_0.9fr]">
        <div className="hidden border-r border-border bg-surface-muted p-10 lg:flex lg:flex-col lg:justify-center">
          <div className="max-w-lg space-y-5">
            <span className="inline-flex rounded-lg bg-accent-soft px-4 py-2 text-sm font-semibold text-accent-strong">
              InkTrail Backoffice
            </span>
            <div className="space-y-3">
              <h1 className="text-4xl font-semibold leading-tight text-foreground">
                Đăng nhập vào khu vực quản trị nội dung
              </h1>
              <p className="text-base leading-7 text-muted-foreground">
                Admin quản lý toàn hệ thống. Author quản lý truyện và chương của
                riêng mình.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center p-6 sm:p-10">{children}</div>
      </div>
    </div>
  );
}
