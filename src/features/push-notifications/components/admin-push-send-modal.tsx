"use client";

import { ModalCloseButton } from "@/components/ui/modal-close-button";
import { AdminPushForm } from "@/features/push-notifications/components/admin-push-form";
import type { AdminPushResponse } from "@/features/push-notifications/services/admin-push-service";

type AdminPushSendModalProps = {
  open: boolean;
  onClose: () => void;
  onSent: (response: AdminPushResponse) => void;
};

export function AdminPushSendModal({ open, onClose, onSent }: AdminPushSendModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/30 px-4 py-8">
      <div className="relative w-full max-w-lg rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Gửi thông báo mới</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Tin sẽ tới tất cả người dùng đang dùng ứng dụng, dưới dạng tin chung.
            </p>
          </div>
          <ModalCloseButton onClick={onClose} />
        </div>
        <div className="mt-5">
          <AdminPushForm
            onSuccess={(response) => {
              onSent(response);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
