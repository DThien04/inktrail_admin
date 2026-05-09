type ModalCloseButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  "aria-label"?: string;
};

export function ModalCloseButton({
  onClick,
  disabled,
  "aria-label": ariaLabel = "Đóng",
}: ModalCloseButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-white text-foreground transition hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
    >
      <svg
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    </button>
  );
}
