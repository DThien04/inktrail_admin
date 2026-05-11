"use client";

import { useState } from "react";
import { PageSectionHeader } from "@/components/layout/page-section-header";
import { Toast } from "@/components/ui/toast";
import { AdminBroadcastLogsTable } from "@/features/push-notifications/components/admin-broadcast-logs-table";
import { AdminPushSendModal } from "@/features/push-notifications/components/admin-push-send-modal";
import type { AdminPushResponse } from "@/features/push-notifications/services/admin-push-service";

export default function PushNotificationsPage() {
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [logsRefreshKey, setLogsRefreshKey] = useState(0);
  const [toastMessage, setToastMessage] = useState("");

  return (
    <div className="space-y-6">
      <PageSectionHeader
        title="Gửi thông báo"
        description="Gửi một tin chung tới mọi người dùng trong ứng dụng (tin trong app và thông báo trên thiết bị khi có)."
        action={
          <button
            type="button"
            onClick={() => setSendModalOpen(true)}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-strong"
          >
            Gửi thông báo mới
          </button>
        }
      />
      <AdminBroadcastLogsTable refreshKey={logsRefreshKey} />
      <AdminPushSendModal
        open={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        onSent={(response: AdminPushResponse) => {
          setLogsRefreshKey((k) => k + 1);
          setToastMessage(
            `Đã gửi: ${response.summary.created}/${response.summary.total}. Lỗi: ${response.summary.failed}.`,
          );
        }}
      />
      <Toast
        open={Boolean(toastMessage)}
        title="Gửi thông báo thành công"
        message={toastMessage}
        variant="success"
        onClose={() => setToastMessage("")}
      />
    </div>
  );
}
