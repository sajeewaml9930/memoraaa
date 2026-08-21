"use client";

import { FormEvent, useState } from "react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type AccountAction = "deactivate" | "delete";

export function AccountActionsDialog() {
  const [open, setOpen] = useState(false);
  const [finalOpen, setFinalOpen] = useState(false);
  const [action, setAction] = useState<AccountAction | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const expectedConfirmation = action === "delete" ? "DELETE" : "DEACTIVATE";

  const chooseAction = (nextAction: AccountAction | null) => {
    setAction(nextAction);
    setPassword("");
    setConfirmation("");
    setError("");
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password) {
      setError("Enter your current password.");
      return;
    }
    if (confirmation !== expectedConfirmation) {
      setError(`Type ${expectedConfirmation} exactly to continue.`);
      return;
    }
    setError("");
    setFinalOpen(true);
  };

  const executeAction = async () => {
    if (!action) return;
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          password,
          confirmation,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Unable to update your account");
      }
      await signOut({ callbackUrl: "/login?account=updated" });
    } catch (requestError) {
      setFinalOpen(false);
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update your account",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeDialog = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setAction(null);
      setPassword("");
      setConfirmation("");
      setError("");
      setFinalOpen(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={closeDialog}>
        <DialogTrigger render={<Button variant="destructive" />}>
          Manage account
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action ? `Confirm ${action}` : "Manage account"}
            </DialogTitle>
            <DialogDescription>
              {action
                ? `This will ${action} your Memoraa account. Enter your password and type ${expectedConfirmation} to continue.`
                : "Choose whether to temporarily deactivate your account or permanently delete it."}
            </DialogDescription>
          </DialogHeader>

          {!action ? (
            <div className="grid gap-3">
              <Button
                variant="outline"
                onClick={() => chooseAction("deactivate")}
              >
                Deactivate account
              </Button>
              <Button
                variant="destructive"
                onClick={() => chooseAction("delete")}
              >
                Delete account permanently
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="account-password"
                  className="text-sm font-medium"
                >
                  Current password
                </label>
                <input
                  id="account-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/50"
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="account-confirmation"
                  className="text-sm font-medium"
                >
                  Type {expectedConfirmation} to confirm
                </label>
                <input
                  id="account-confirmation"
                  type="text"
                  required
                  autoComplete="off"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none transition focus:border-ring focus:ring-3 focus:ring-ring/50"
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
                  onClick={() => chooseAction(null)}
                  disabled={isSubmitting}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  disabled={isSubmitting}
                >
                  Continue
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={finalOpen} onOpenChange={setFinalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {action === "delete"
                ? "Permanently delete your account?"
                : "Deactivate your account?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {action === "delete"
                ? "All albums, memories, and account data will be permanently deleted. This cannot be undone."
                : "Your account will be disabled and you will be signed out. You can contact support to reactivate it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void executeAction();
              }}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Processing..."
                : action === "delete"
                  ? "Delete permanently"
                  : "Deactivate account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
