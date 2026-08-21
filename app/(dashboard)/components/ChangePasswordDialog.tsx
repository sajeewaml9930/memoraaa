"use client";

import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface PasswordFields {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

type FieldErrors = Partial<Record<keyof PasswordFields, string>>;

const initialFields: PasswordFields = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  const toast = (nextMessage: string) => {
    setMessage(nextMessage);
    window.setTimeout(() => setMessage(null), 3500);
  };

  return { message, toast };
}

export function ChangePasswordDialog() {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<PasswordFields>(initialFields);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { message, toast } = useToast();

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setFields(initialFields);
      setErrors({});
      setSubmitError(null);
      setIsSubmitting(false);
    }
  };

  const updateField = (field: keyof PasswordFields, value: string) => {
    setFields((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setSubmitError(null);
  };

  const validate = (): FieldErrors => {
    const nextErrors: FieldErrors = {};
    if (!fields.currentPassword) {
      nextErrors.currentPassword = "Enter your current password";
    }
    if (!fields.newPassword) {
      nextErrors.newPassword = "Enter a new password";
    } else if (fields.newPassword.length < 8) {
      nextErrors.newPassword = "Password must be at least 8 characters";
    }
    if (!fields.confirmPassword) {
      nextErrors.confirmPassword = "Confirm your new password";
    } else if (fields.confirmPassword !== fields.newPassword) {
      nextErrors.confirmPassword = "Passwords do not match";
    }
    return nextErrors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: fields.currentPassword,
          newPassword: fields.newPassword,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to change password");
      }

      setOpen(false);
      toast("Password updated successfully");
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Unable to change password",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger render={<Button variant="outline" />}>
          Change password
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Choose a new password for your Memoraa account.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" noValidate onSubmit={handleSubmit}>
            <PasswordField
              id="current-password"
              label="Current password"
              value={fields.currentPassword}
              error={errors.currentPassword}
              onChange={(value) => updateField("currentPassword", value)}
            />
            <PasswordField
              id="new-password"
              label="New password"
              value={fields.newPassword}
              error={errors.newPassword}
              onChange={(value) => updateField("newPassword", value)}
            />
            <PasswordField
              id="confirm-password"
              label="Confirm new password"
              value={fields.confirmPassword}
              error={errors.confirmPassword}
              onChange={(value) => updateField("confirmPassword", value)}
            />
            {submitError && (
              <p className="text-sm text-destructive" role="alert">
                {submitError}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {message && (
        <div
          className="fixed right-4 bottom-4 z-60 rounded-lg bg-slate-900 px-4 py-3 text-sm text-white shadow-lg"
          role="status"
        >
          {message}
        </div>
      )}
    </>
  );
}

function PasswordField({
  id,
  label,
  value,
  error,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium" htmlFor={id}>
        {label}
      </label>
      <Input
        id={id}
        type="password"
        value={value}
        autoComplete={
          id === "current-password" ? "current-password" : "new-password"
        }
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
