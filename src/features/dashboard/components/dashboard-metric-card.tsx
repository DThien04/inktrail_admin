type DashboardMetricCardProps = {
  label: string;
  value: string;
  helper: string;
};

export function DashboardMetricCard({
  label,
  value,
  helper,
}: DashboardMetricCardProps) {
  return (
    <article className="data-card p-6">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-foreground">{value}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{helper}</p>
    </article>
  );
}
