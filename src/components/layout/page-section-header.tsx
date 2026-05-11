import type { ReactNode } from "react";

type PageSectionHeaderProps = {
  title: string;
  description: string;
  actionLabel?: string;
  action?: ReactNode;
};

export function PageSectionHeader({
  title,
  description,
  actionLabel,
  action,
}: PageSectionHeaderProps) {
  return (
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-3 h-1 w-16 rounded-full bg-accent" />
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {action ? action : null}
      {!action && actionLabel ? (
        <button className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong">
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
