const NOISE_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.04'/%3E%3C/svg%3E\")";

function BookIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-[#C8956B]"
      aria-hidden
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[18px] font-bold text-[#C8956B]">{value}</span>
      <span className="text-[11px] uppercase tracking-[0.06em] text-[#F5EDE0]/45">
        {label}
      </span>
    </div>
  );
}

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const year = new Date().getFullYear();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F5EDE0] px-6 py-12">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{ backgroundImage: NOISE_TEXTURE, backgroundSize: "256px" }}
      />

      <div className="relative z-10 grid w-full max-w-[920px] overflow-hidden rounded-[20px] shadow-[0_24px_80px_rgba(80,40,10,0.15),0_4px_20px_rgba(80,40,10,0.08)] lg:grid-cols-[1.1fr_1fr]">
        <aside className="relative hidden overflow-hidden bg-[#2C1A0E] p-10 lg:flex lg:flex-col lg:justify-end">
          <div
            aria-hidden
            className="absolute -right-16 -top-16 h-60 w-60 rounded-full bg-[rgba(200,149,107,0.12)]"
          />
          <div
            aria-hidden
            className="absolute right-10 top-20 h-24 w-24 rounded-full bg-[rgba(200,149,107,0.08)]"
          />
          <div
            aria-hidden
            className="absolute -left-10 bottom-32 h-40 w-40 rounded-full bg-[rgba(200,149,107,0.06)]"
          />

          <div className="relative z-10">
            <div className="mb-7 flex items-center gap-2">
              <BookIcon />
              <span className="text-[13px] tracking-[0.04em] text-white/50">
                InkTrail Backoffice
              </span>
            </div>

            <h1 className="m-0 mb-4 text-[28px] font-bold leading-[1.3] tracking-[-0.01em] text-[#F5EDE0]">
              Đăng nhập vào
              <br />
              khu vực quản trị
              <br />
              nội dung
            </h1>

            <p className="m-0 mb-8 text-[13px] leading-[1.7] text-[#F5EDE0]/50">
              Admin quản lý toàn hệ thống nội dung, người dùng và báo cáo.
            </p>

            <div className="flex gap-6">
              <Stat value="120+" label="Truyện" />
              <Stat value="850+" label="Chương" />
              <Stat value="5k+" label="Độc giả" />
            </div>
          </div>
        </aside>

        <section className="flex min-h-[540px] flex-col justify-between bg-[#FFFAF5] px-10 py-12 sm:px-11">
          <div className="flex w-full flex-1 items-center justify-center">
            <div className="w-full max-w-md">{children}</div>
          </div>
          <p className="mt-8 text-center text-[11px] text-[#C4A882]">
            © {year} InkTrail. Dành cho quản trị viên.
          </p>
        </section>
      </div>
    </main>
  );
}
