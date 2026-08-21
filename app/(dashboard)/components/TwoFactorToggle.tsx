"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";

export function TwoFactorToggle() {
  const [enabled, setEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const otpInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/auth/two-factor");
        const data = await response.json().catch(() => ({}));
        if (response.ok) setEnabled(Boolean(data.enabled));
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    if (open) otpInputRef.current?.focus();
  }, [open]);

  const requestEnable = async () => {
    setIsSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Unable to send verification code");
      setOtp("");
      setOpen(true);
      setNotice("A verification code was sent to your email.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to enable two-factor authentication",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const disable = async () => {
    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/auth/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: false }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(
          data.error || "Unable to disable two-factor authentication",
        );
      setEnabled(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to disable two-factor authentication",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the 6-digit verification code.");
      return;
    }

    setIsSaving(true);
    setError("");
    try {
      const response = await fetch("/api/auth/two-factor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: true, otp }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(data.error || "Invalid or expired verification code");
      setEnabled(true);
      setOpen(false);
      setNotice("Two-factor authentication is enabled.");
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Unable to verify the code",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setOtp("");
      setError("");
      setNotice("");
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Switch
        checked={enabled}
        disabled={isLoading || isSaving}
        aria-label="Two-factor authentication"
        onCheckedChange={(checked) => {
          if (checked) void requestEnable();
          else void disable();
        }}
      />
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm two-factor authentication</DialogTitle>
            <DialogDescription>
              Enter the 6-digit code sent to your account email to enable
              two-factor authentication.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={verify} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="two-factor-otp" className="text-sm font-medium">
                Verification code
              </label>
              <input
                ref={otpInputRef}
                id="two-factor-otp"
                type="text"
                inputMode="numeric"
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
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Verifying..." : "Enable 2FA"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {(error || notice) && !open && (
        <p
          className={`mt-2 text-xs ${error ? "text-destructive" : "text-emerald-600"}`}
          role={error ? "alert" : "status"}
        >
          {error || notice}
        </p>
      )}
    </div>
  );
}
