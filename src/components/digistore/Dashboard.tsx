import React from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { LogOut, ShoppingBag, ShieldCheck, Mail, Phone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { GlassCard } from "./GlassCard";
import { DIGISTORE_CONFIG } from "@/config/auth-config";

/**
 * Dashboard Profile Glass Banner Component
 * Displays avatar, name, email, phone number, provider badge, and Logout button in the signature frosted glass style.
 */
export function Dashboard() {
  const { user, signOut } = useAuth();

  const displayName =
    user?.name || (user?.email ? user.email.split("@")[0] : "Creator");
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <GlassCard maxWidthClass="max-w-full" className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          <div className="relative shrink-0">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={displayName}
                className="w-14 h-14 rounded-2xl object-cover border border-[#10b981]/40 shadow-[0_0_20px_rgba(16,185,129,0.25)]"
              />
            ) : (
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #059669 0%, #10b981 50%, #06b6d4 100%)",
                }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-display font-bold text-xl shadow-[0_8px_24px_rgba(16,185,129,0.4)]"
              >
                {initial}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#090d16]" />
          </div>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-white truncate">
                {displayName}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#10b981]/15 text-[#34d399] border border-[#10b981]/30 uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3" />
                {user?.provider || "Verified"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-white/65">
              {user?.email && (
                <p className="flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-[#34d399] shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
              )}
              {user?.phoneNumber && (
                <p className="flex items-center gap-1.5 truncate">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="truncate">{user.phoneNumber}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <Link
            to="/shop"
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(16, 185, 129, 0.28)",
            }}
            className="h-10 px-4 rounded-[12px] text-[13px] font-medium text-white/90 hover:bg-white/10 inline-flex items-center gap-2 transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-[#34d399]" />
            <span>Explore {DIGISTORE_CONFIG.siteName}</span>
          </Link>

          <motion.button
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={signOut}
            style={{
              background:
                "linear-gradient(135deg, #059669 0%, #10b981 50%, #06b6d4 100%)",
              boxShadow: "0 6px 20px rgba(16, 185, 129, 0.38)",
            }}
            className="h-10 px-4 rounded-[12px] text-[13px] font-bold text-white inline-flex items-center gap-2 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </motion.button>
        </div>
      </div>
    </GlassCard>
  );
}
