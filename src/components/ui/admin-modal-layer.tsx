import type { ReactNode } from "react";

type AdminModalLayerProps = {
  children: ReactNode;
  /** `center`: giữa màn hình. `scrollTop`: phía trên, cuộn khi nội dung cao. */
  placement?: "center" | "scrollTop";
  zIndex?: 40 | 50;
  /** Thêm class lên lớp nền (ví dụ `py-8`). */
  overlayClassName?: string;
};

export function AdminModalLayer({
  children,
  placement = "center",
  zIndex = 50,
  overlayClassName = "",
}: AdminModalLayerProps) {
  const placementClasses =
    placement === "scrollTop"
      ? "items-start justify-center overflow-auto"
      : "items-center justify-center";

  const zClass = zIndex === 40 ? "z-40" : "z-50";

  return (
    <div
      className={`admin-modal-layer fixed inset-0 ${zClass} flex bg-black/30 px-4 ${placementClasses} ${overlayClassName}`.trim()}
      role="presentation"
    >
      {children}
    </div>
  );
}
