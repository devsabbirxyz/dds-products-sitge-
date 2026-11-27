import { createFileRoute, redirect } from "@tanstack/react-router";
import { AuthPage } from "@/components/digistore/AuthPage";

export const Route = createFileRoute("/register")({
  validateSearch: (s: Record<string, unknown>) => ({
    next: typeof s.next === "string" ? s.next : undefined,
  }),
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/signup",
      search: search as never,
    });
  },
  component: () => <AuthPage mode="signup" />,
});
