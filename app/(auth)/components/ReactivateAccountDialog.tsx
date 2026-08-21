"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ReactivateAccountDialog({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  const router = useRouter();
  const otpInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((current) => Math.max(current - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (open) otpInputRef.current?.focus();
  }, [open]);

  const sendCode = async () => {
    if (!email || cooldown > 0) return;
    setIsLoading(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Unable to send reactivation code");
      setCooldown(60);
      setNotice("A 6-digit code was sent to your registered email.");
      setOpen(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send reactivation code",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit verification code.");
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/auth/verify-reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Invalid or expired verification code");

      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (signInResult?.ok) {
        router.push("/albums");
      } else {
        setOpen(false);
        setError("Account reactivated. Please sign in again.");
      }
    } catch (verificationError) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : "Unable to verify the code",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => void sendCode()}
        disabled={isLoading || !email}
        className="group w-full border-blue-200 text-blue-700 shadow-sm transition-all duration-200 hover:scale-[1.01] hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800 hover:shadow-md focus-visible:ring-blue-200"
      >
        <RefreshCw
          className={`transition-transform duration-300 ${isLoading ? "animate-spin" : "group-hover:rotate-90"}`}
          aria-hidden="true"
        />
        {isLoading ? "Sending code..." : "Reactivate account"}
      </Button>
      {error && !open && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reactivate account</DialogTitle>
            <DialogDescription>
              Enter the 6-digit code sent to your registered email address to
              reactivate your account.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={verify} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="reactivate-otp" className="text-sm font-medium">
                Verification code
              </label>
              <input
                ref={otpInputRef}
                id="reactivate-otp"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                className="h-12 w-full rounded-lg border border-input bg-transparent px-3 text-center text-xl tracking-[0.5em] outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/50"
              />
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            {notice && (
              <p className="text-sm text-emerald-600" role="status">
                {notice}
              </p>
            )}
            <button
              type="button"
              onClick={() => void sendCode()}
              disabled={isLoading || cooldown > 0}
              className="text-sm font-semibold text-blue-600 disabled:text-gray-400"
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Verify"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
