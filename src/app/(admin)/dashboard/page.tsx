import { DashboardMetricCard } from "@/features/dashboard/components/dashboard-metric-card";
import { QuickLinkCard } from "@/features/dashboard/components/quick-link-card";
import { DASHBOARD_METRICS, QUICK_LINKS } from "@/features/dashboard/constants";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="data-card overflow-hidden p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                Tổng quan
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                Khung dashboard cơ bản để nối số liệu truyện, chương, người dùng và banner.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-accent-strong">
            Dùng <code className="font-mono">NEXT_PUBLIC_API_BASE_URL</code> để đổi server
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {DASHBOARD_METRICS.map((metric) => (
          <DashboardMetricCard key={metric.label} {...metric} />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {QUICK_LINKS.map((item) => (
          <QuickLinkCard key={item.title} {...item} />
        ))}
      </section>
    </div>
  );
}
