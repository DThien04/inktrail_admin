type QuickLinkCardProps = {
  title: string;
  description: string;
  badge: string;
};

export function QuickLinkCard({
  title,
  description,
  badge,
}: QuickLinkCardProps) {
  return (
    <article className="data-card p-6">
      <span className="inline-flex rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent-strong">
        {badge}
      </span>
      <h2 className="mt-4 text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
    </article>
  );
}
