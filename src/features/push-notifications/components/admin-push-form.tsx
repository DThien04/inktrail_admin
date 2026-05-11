"use client";

import { useState } from "react";
import {
  postAdminPushNotifications,
  type AdminPushResponse,
} from "@/features/push-notifications/services/admin-push-service";

type AdminPushFormProps = {
  onSuccess?: (response: AdminPushResponse) => void;
};

export function AdminPushForm({ onSuccess }: AdminPushFormProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const inputClass =
    "w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-foreground shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-accent";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErrorMessage("");

    if (!title.trim()) {
      setErrorMessage("Vui lòng nhập tiêu đề.");
      return;
    }
    if (!body.trim()) {
      setErrorMessage("Vui lòng nhập nội dung.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await postAdminPushNotifications({
        title: title.trim(),
        body: body.trim(),
      });
      setTitle("");
      setBody("");
      onSuccess?.(response);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Không gửi được. Hãy thử lại.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-5">
      {errorMessage ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <div>
        <label htmlFor="push-title" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tiêu đề
        </label>
        <input
          id="push-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          placeholder="Ví dụ: Bảo trì hệ thống đêm nay"
        />
      </div>

      <div>
        <label htmlFor="push-body" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Nội dung
        </label>
        <textarea
          id="push-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          className={`${inputClass} min-h-[120px] resize-y py-3`}
          placeholder="Viết nội dung chi tiết cho người dùng."
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Đang gửi…" : "Gửi cho mọi người"}
        </button>
      </div>
    </form>
  );
}
