import { createFileRoute } from "@tanstack/react-router";
import { VerifyOtpScreen } from "@/components/otp/VerifyOtpScreen";

export const Route = createFileRoute("/verify")({
  component: VerifyOtpScreen,
});

