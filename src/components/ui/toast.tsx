import { useEffect } from "react";

type ToastVariant = "success" | "error";

export type ToastProps = {
  open: boolean;
  title: string;
  message: string;
  variant?: ToastVariant;
  durationMs?: number;
  onClose?: () => void;
};

export function Toast({
  open,
  title,
  message,
  variant = "success",
  durationMs = 3200,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (!open) return;
    if (!onClose) return;
    const t = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(t);
  }, [open, onClose, durationMs]);

  if (!open) return null;

  const isSuccess = variant === "success";
  const border = isSuccess ? "border-emerald-200" : "border-red-200";
  const bg = isSuccess ? "bg-emerald-50" : "bg-red-50";
  const titleColor = isSuccess ? "text-emerald-900" : "text-red-900";
  const bodyColor = isSuccess ? "text-emerald-800" : "text-red-800";

  return (
    <div className={`fixed bottom-6 right-6 z-50 w-full max-w-[360px] rounded-xl border ${border} ${bg} px-4 py-3 text-sm shadow-lg`}>
      <p className={`font-semibold ${titleColor}`}>{title}</p>
      <p className={`mt-1 ${bodyColor}`}>{message}</p>
    </div>
  );
}

