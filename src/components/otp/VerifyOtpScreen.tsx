import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { OtpCard } from "@/components/otp/OtpCard";
import {
  requestEmailOtpServer,
  verifyEmailOtpServer,
} from "@/lib/otp.functions";
import { getLocalUser, saveLocalUser } from "@/lib/firebase-auth";

export function VerifyOtpScreen() {
  const navigate = useNavigate();

  // Read optional query parameters (?autoplay=1, ?length=6, ?email=..., ?demo=1, ?next=/dashboard)
  const searchParams = useMemo(
    () =>
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams(),
    [],
  );

  const initialAutoPlay =
    searchParams.get("autoplay") === "1" || searchParams.get("autoplay") === "true";
  const initialLength: 4 | 6 = searchParams.get("length") === "4" ? 4 : 6;
  const initialIdentifier =
    searchParams.get("email") || getLocalUser()?.email || "s•••••@gmail.com";
  const initialDemoMode =
    searchParams.get("demo") === "1" || searchParams.get("demo") === "true";

  const [challengeToken, setChallengeToken] = useState<string>("");

  // Request a real signed OTP challenge when visiting /verify with a real email address
  useEffect(() => {
    if (
      initialAutoPlay ||
      initialDemoMode ||
      !initialIdentifier.includes("@") ||
      initialIdentifier.includes("•")
    ) {
      return;
    }
    requestEmailOtpServer({
      data: {
        email: initialIdentifier.trim().toLowerCase(),
        purpose: "login",
      },
    })
      .then((res) => {
        if (res.ok && res.challengeToken) {
          setChallengeToken(res.challengeToken);
        }
      })
      .catch(() => {});
  }, [initialAutoPlay, initialDemoMode, initialIdentifier]);

  const handleVerify = useCallback(
    async (code: string): Promise<boolean> => {
      if (initialDemoMode) {
        return initialLength === 6 ? code === "123456" : code === "1234";
      }
      if (!challengeToken || !initialIdentifier.includes("@") || initialIdentifier.includes("•")) {
        return false;
      }
      try {
        const res = await verifyEmailOtpServer({
          data: {
            email: initialIdentifier.trim().toLowerCase(),
            code,
            purpose: "login",
            challengeToken,
          },
        });
        return Boolean(res.ok);
      } catch {
        return false;
      }
    },
    [initialDemoMode, initialLength, initialIdentifier, challengeToken],
  );

  const handleResend = useCallback(async (): Promise<void> => {
    if (initialDemoMode || !initialIdentifier.includes("@") || initialIdentifier.includes("•")) {
      return;
    }
    const res = await requestEmailOtpServer({
      data: {
        email: initialIdentifier.trim().toLowerCase(),
        purpose: "login",
      },
    });
    if (res.ok && res.challengeToken) {
      setChallengeToken(res.challengeToken);
    }
  }, [initialDemoMode, initialIdentifier]);

  const handleSuccess = useCallback(() => {
    if (!getLocalUser() && initialIdentifier.includes("@") && !initialIdentifier.includes("•")) {
      const cleanEmail = initialIdentifier.trim().toLowerCase();
      const displayName =
        cleanEmail
          .split("@")[0]
          .replace(/[•._-]/g, " ")
          .trim() || "Verified Member";
      const fallbackUuid =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
          ? crypto.randomUUID()
          : "00000000-0000-4000-8000-000000000001";
      saveLocalUser({
        id: fallbackUuid,
        email: cleanEmail,
        displayName,
        provider: "email",
        emailVerified: true,
        createdAt: new Date().toISOString(),
      });
    }
    const nextUrl = searchParams.get("next") || "/dashboard";
    if (typeof window !== "undefined") {
      window.location.assign(nextUrl);
    } else {
      navigate({ to: nextUrl });
    }
  }, [initialIdentifier, navigate, searchParams]);

  return (
    <main className="relative min-h-screen w-full">
      <OtpCard
        length={initialLength}
        maskedIdentifier={initialIdentifier}
        demoMode={initialDemoMode}
        autoPlay={initialAutoPlay}
        initialCooldown={30}
        fullScreen={true}
        onChangeEmail={() => navigate({ to: "/signup" })}
        onVerify={handleVerify}
        onResend={handleResend}
        onSuccess={handleSuccess}
      />
    </main>
  );
}
