"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { hasAdminSession } from "@/features/auth/auth-guard";
import { login } from "@/features/auth/services/auth-service";
import { clearAuthSession, setAuthSession } from "@/features/auth/storage";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  useEffect(() => {
    if (hasAdminSession()) {
      router.replace(nextPath);
    }
  }, [nextPath, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const result = await login({
        email: email.trim(),
        password,
      });

      if (result.user.role !== "admin") {
        clearAuthSession();
        setErrorMessage("Tài khoản này không có quyền truy cập quản trị.");
        return;
      }

      setAuthSession({
        accessToken: result.accessToken,
        user: result.user,
      });

      router.replace(nextPath);
    } catch (error) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Đăng nhập thất bại. Vui lòng thử lại.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-3">
        <span className="inline-flex rounded-lg bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-strong">
          Đăng nhập quản trị
        </span>
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground">
            Chào mừng quay lại
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Nhập thông tin đăng nhập để tiếp tục vào hệ thống quản trị InkTrail.
          </p>
        </div>
      </div>

      <form className="data-card space-y-5 p-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@inktrail.vn"
            autoComplete="email"
            className="w-full rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="password">
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            className="w-full rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm outline-none transition focus:border-accent"
          />
        </div>

        {errorMessage ? (
          <div className="rounded-xl border border-accent bg-accent-soft px-4 py-3 text-sm text-accent-strong">
            {errorMessage}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}
