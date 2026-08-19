"use client";

import { signOut, SessionProvider, useSession } from "next-auth/react";
import { ReactNode, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SessionLifecycle>{children}</SessionLifecycle>
    </SessionProvider>
  );
}

function SessionLifecycle({ children }: { children: ReactNode }) {
  const isLoggingOutRef = useRef(false);
  const hasValidatedSessionRef = useRef(false);
  const pathname = usePathname();
  const { status } = useSession();

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const handleSessionInvalidation = async (response: Response) => {
      if (isLoggingOutRef.current || window.location.pathname === "/login") {
        return;
      }

      const isUnauthorized = response.status === 401;
      let isUserNotFound = false;

      if (response.status === 404) {
        try {
          const body = await response.clone().text();
          isUserNotFound = /user\s+not\s+found/i.test(body);
        } catch {
          isUserNotFound = false;
        }
      }

      if (!isUnauthorized && !isUserNotFound) {
        return;
      }

      isLoggingOutRef.current = true;
      await signOut({ callbackUrl: "/login?reason=session-expired" });
    };

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const requestUrl =
        typeof args[0] === "string"
          ? args[0]
          : args[0] instanceof URL
            ? args[0].toString()
            : args[0].url;

      if (new URL(requestUrl, window.location.origin).pathname.startsWith("/api/")) {
        void handleSessionInvalidation(response);
      }

      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  useEffect(() => {
    if (status !== "authenticated") {
      hasValidatedSessionRef.current = false;
      return;
    }

    if (pathname === "/login" || hasValidatedSessionRef.current) {
      return;
    }

    hasValidatedSessionRef.current = true;
    void fetch("/api/user/profile", { cache: "no-store" });
  }, [pathname, status]);

  return children;
}
