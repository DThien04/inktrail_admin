"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { hasBackofficeSession } from "@/features/auth/auth-guard";
import { login } from "@/features/auth/services/auth-service";
import {
  clearAuthSession,
  getStoredUser,
  setAuthSession,
} from "@/features/auth/storage";
import { getDefaultPathByRole } from "@/lib/constants/routes";

function MailIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#A8896C"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute left-3.5 shrink-0"
      aria-hidden
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#A8896C"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="pointer-events-none absolute left-3.5 shrink-0"
      aria-hidden
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#A8896C"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#A8896C"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");

  useEffect(() => {
    if (!hasBackofficeSession()) return;

    const storedUser = getStoredUser();
    router.replace(nextPath || getDefaultPathByRole(storedUser?.role));
  }, [nextPath, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim() || !password) {
      setErrorMessage("Vui lòng nhập đầy đủ thông tin.");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const result = await login({
        email: email.trim(),
        password,
      });

      if (result.user.role !== "admin") {
        clearAuthSession();
        setErrorMessage("Tài khoản này không có quyền truy cập backoffice.");
        return;
      }

      setAuthSession({
        accessToken: result.accessToken,
        user: result.user,
      });

      router.replace(nextPath || getDefaultPathByRole(result.user.role));
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
    <div className="flex w-full flex-col">
      <span className="mb-5 self-start rounded-full bg-[#F3E4D2] px-3 py-1 text-[11px] tracking-[0.04em] text-[#7C4B2A]">
        Đăng nhập backoffice
      </span>

      <h2 className="m-0 mb-2 text-[26px] font-bold tracking-[-0.02em] text-[#1E0F06]">
        Chào mừng quay lại
      </h2>
      <p className="m-0 mb-8 text-[13px] leading-[1.6] text-[#9C7A5E]">
        Đăng nhập bằng tài khoản admin để tiếp tục làm việc.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col">
        <div className="mb-4 flex flex-col">
          <label
            htmlFor="email"
            className="mb-1.5 text-[12px] font-semibold tracking-[0.04em] text-[#5C3A20]"
          >
            Email
          </label>
          <div className="relative flex items-center">
            <MailIcon />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              placeholder="admin@inktrail.vn"
              disabled={isSubmitting}
              className="w-full rounded-[10px] border-[1.5px] border-[#E2D5C8] bg-[#FDF7F0] py-2.5 pl-10 pr-3.5 text-[14px] text-[#2C1A0E] outline-none transition focus:border-[#7C4B2A] disabled:opacity-60"
            />
          </div>
        </div>

        <div className="mb-6 flex flex-col">
          <label
            htmlFor="password"
            className="mb-1.5 text-[12px] font-semibold tracking-[0.04em] text-[#5C3A20]"
          >
            Mật khẩu
          </label>
          <div className="relative flex items-center">
            <LockIcon />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              placeholder="Nhập mật khẩu"
              disabled={isSubmitting}
              className="w-full rounded-[10px] border-[1.5px] border-[#E2D5C8] bg-[#FDF7F0] py-2.5 pl-10 pr-11 text-[14px] text-[#2C1A0E] outline-none transition focus:border-[#7C4B2A] disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              disabled={isSubmitting}
              className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-md text-[#A8896C] transition hover:bg-[#F3E4D2] disabled:opacity-50"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>

        {errorMessage ? (
          <p className="mb-4 rounded-[8px] border border-[#F5C6C2] bg-[#FEF0EE] px-3 py-2 text-[12px] text-[#C0392B]">
            {errorMessage}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="flex w-full items-center justify-center rounded-[10px] bg-[#7C4B2A] px-4 py-3 text-[14px] font-semibold tracking-[0.02em] text-[#F5EDE0] transition hover:bg-[#5C3A20] disabled:cursor-not-allowed disabled:opacity-75"
        >
          {isSubmitting ? (
            <span
              aria-hidden
              className="inline-block h-[18px] w-[18px] animate-spin rounded-full border-2 border-[rgba(245,237,224,0.3)] border-t-[#F5EDE0]"
            />
          ) : (
            "Đăng nhập"
          )}
        </button>
      </form>
    </div>
  );
}
