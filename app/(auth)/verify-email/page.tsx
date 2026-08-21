"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

function VerifyEmailForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fromLogin = searchParams.get("from") === "login";
  const email = searchParams.get("email")?.trim() ?? "";
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(fromLogin ? 0 : 60);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const verify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!email) {
      setError("This verification link is missing your email address.");
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Invalid code. Please try again.");
        return;
      }

      const registrationPassword = sessionStorage.getItem(
        "memoraa-registration-password",
      );
      sessionStorage.removeItem("memoraa-registration-password");

      if (registrationPassword) {
        const signInResult = await signIn("credentials", {
          email,
          password: registrationPassword,
          redirect: false,
        });

        if (signInResult?.ok) {
          router.push("/albums");
          return;
        }
      }

      router.push("/login?verified=true");
    } catch {
      setError("Unable to verify your email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0 || !email) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Unable to resend the code.");
        return;
      }
      setCooldown(60);
      setNotice("A new verification code has been sent.");
    } catch {
      setError("Unable to resend the code. Please try again.");
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const nextOtp = otp.split("");
    nextOtp[index] = digit;
    setOtp(nextOtp.join("").slice(0, 6));
    setError("");

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      inputRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedOtp = event.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6);
    if (!pastedOtp) return;

    setOtp(pastedOtp);
    setError("");
    inputRefs.current[Math.min(pastedOtp.length, 6) - 1]?.focus();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-50 to-blue-100 px-4">
      <div className="w-full max-w-md rounded-lg bg-white px-8 py-12 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-blue-600">Memoraa</h1>
          <h2 className="mt-6 text-2xl font-semibold text-gray-900">
            Verify your email
          </h2>
          <p className="mt-2 text-gray-600">
            We sent a 6-digit verification code to{" "}
            <strong>{email || "your email address"}</strong>.
          </p>
        </div>

        <form onSubmit={verify} className="space-y-5">
          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-gray-700"
            >
              Verification code
            </label>
            <div
              className="mt-2 grid grid-cols-6 gap-2 sm:gap-3"
              role="group"
              aria-label="Six-digit verification code"
            >
              {Array.from({ length: 6 }, (_, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    inputRefs.current[index] = element;
                  }}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]"
                  maxLength={1}
                  value={otp[index] ?? ""}
                  onChange={(event) =>
                    handleOtpChange(index, event.target.value)
                  }
                  onKeyDown={(event) => handleOtpKeyDown(index, event)}
                  onPaste={handleOtpPaste}
                  className="h-14 w-full rounded-xl border border-gray-300 bg-white text-center text-2xl font-semibold text-gray-900 shadow-sm outline-none transition-all duration-200 placeholder:text-gray-300 hover:border-blue-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  aria-label={`Verification digit ${index + 1}`}
                  aria-describedby={error ? "verification-error" : undefined}
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  autoFocus={index === 0}
                />
              ))}
            </div>
          </div>

          {error && (
            <p
              id="verification-error"
              className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"
              role="alert"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700"
              role="status"
            >
              {notice}
            </p>
          )}

          <Button
            type="submit"
            disabled={isLoading || !email}
            className="w-full"
          >
            {isLoading ? "Verifying..." : "Verify email"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <button
            type="button"
            onClick={resend}
            disabled={cooldown > 0 || !email}
            className="font-semibold text-blue-600 disabled:text-gray-400"
          >
            {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
          </button>
          <span className="mx-2">·</span>
          <Link
            href="/login"
            className="font-semibold text-blue-600 hover:text-blue-700"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailForm />
    </Suspense>
  );
}
