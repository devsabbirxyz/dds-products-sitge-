import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { saveSettingsBulk } from "@/lib/admin.functions";
import { testTelegramNotification } from "@/lib/telegram.functions";
import { verifyTelegramBotTokenInfoServer } from "@/lib/otp.functions";
import { toast } from "sonner";
import {
  Send,
  Save,
  MessageCircle,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";

const settingsQuery = queryOptions({
  queryKey: ["admin", "telegram-settings"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("key,value")
      .in("key", ["telegram_bot_token", "telegram_chat_id", "telegram_otp_bot_token"]);
    if (error) throw error;
    const map: Record<string, string> = {};
    for (const r of data ?? []) map[r.key] = r.value ?? "";
    return map;
  },
});

export const Route = createFileRoute("/admin/telegram")({
  head: () => ({
    meta: [
      { title: "Telegram Bots (Admin & OTP) — Admin" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminTelegram,
});

function AdminTelegram() {
  const { data, isLoading } = useQuery(settingsQuery);
  const qc = useQueryClient();
  const saveBulk = useServerFn(saveSettingsBulk);
  const test = useServerFn(testTelegramNotification);

  // Bot 1: Admin Notification Bot
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [savingAdminBot, setSavingAdminBot] = useState(false);
  const [testingAdminBot, setTestingAdminBot] = useState(false);

  // Bot 2: Customer Login & Password Reset OTP Bot
  const DEFAULT_OTP_BOT_TOKEN = "9025719963:AAEE3GRNZqUk1dtWeItdKyznlNR32FykbfU";
  const [otpBotToken, setOtpBotToken] = useState(DEFAULT_OTP_BOT_TOKEN);
  const [savingOtpBot, setSavingOtpBot] = useState(false);
  const [verifyingOtpBot, setVerifyingOtpBot] = useState(false);
  const [otpBotInfo, setOtpBotInfo] = useState<{
    username: string;
    firstName: string;
  } | null>(null);

  useEffect(() => {
    if (!data) return;
    setBotToken(data.telegram_bot_token ?? "");
    setChatId(data.telegram_chat_id ?? "");
    const rawSavedOtp = (data.telegram_otp_bot_token || "").trim();
    const savedOtpToken =
      !rawSavedOtp || rawSavedOtp.startsWith("9120839940:")
        ? DEFAULT_OTP_BOT_TOKEN
        : rawSavedOtp;
    setOtpBotToken(savedOtpToken);

    if (savedOtpToken.length > 10) {
      verifyTelegramBotTokenInfoServer({ data: { botToken: savedOtpToken } })
        .then((res) => {
          if (res.ok) {
            setOtpBotInfo({ username: res.username, firstName: res.firstName });
          }
        })
        .catch(() => {});
    }
  }, [data]);

  const saveAdminBot = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      toast.error("অ্যাডমিন বটের Bot Token ও Chat ID দুটোই দিন");
      return;
    }
    setSavingAdminBot(true);
    try {
      await saveBulk({
        data: {
          items: [
            { key: "telegram_bot_token", value: botToken.trim(), group_name: "telegram" },
            { key: "telegram_chat_id", value: chatId.trim(), group_name: "telegram" },
          ],
        },
      });
      toast.success("✅ বট ১ (অ্যাডমিন নোটিফিকেশন বট) সফলভাবে সেভ হয়েছে!");
      qc.invalidateQueries({ queryKey: ["admin", "telegram-settings"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Save ব্যর্থ");
    } finally {
      setSavingAdminBot(false);
    }
  };

  const sendAdminTest = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      toast.error("আগে Bot Token ও Chat ID দিন");
      return;
    }
    setTestingAdminBot(true);
    try {
      await test({ data: { bot_token: botToken.trim(), chat_id: chatId.trim() } });
      toast.success("✅ অ্যাডমিন বটে টেস্ট নোটিফিকেশন পাঠানো হয়েছে!");
    } catch {
      toast.error("❌ Bot Token বা Chat ID সঠিক নয়!");
    } finally {
      setTestingAdminBot(false);
    }
  };

  const saveCustomerOtpBot = async () => {
    const clean = otpBotToken.trim();
    if (!clean) {
      toast.error("কাস্টমার OTP বটের Bot Token দিন");
      return;
    }
    setSavingOtpBot(true);
    try {
      const info = await verifyTelegramBotTokenInfoServer({
        data: { botToken: clean },
      });
      setOtpBotInfo({ username: info.username, firstName: info.firstName });

      await saveBulk({
        data: {
          items: [
            {
              key: "telegram_otp_bot_token",
              value: clean,
              group_name: "telegram",
            },
          ],
        },
      });
      toast.success(
        `✅ বট ২ (OTP Bot: @${info.username}) সফলভাবে কানেক্ট ও সেভ হয়েছে!`
      );
      qc.invalidateQueries({ queryKey: ["admin", "telegram-settings"] });
    } catch (e: any) {
      toast.error(e?.message ?? "OTP Bot Token সঠিক নয়!");
    } finally {
      setSavingOtpBot(false);
    }
  };

  const checkOtpBotNow = async () => {
    const clean = otpBotToken.trim();
    if (!clean) {
      toast.error("আগে OTP Bot Token দিন");
      return;
    }
    setVerifyingOtpBot(true);
    try {
      const info = await verifyTelegramBotTokenInfoServer({
        data: { botToken: clean },
      });
      setOtpBotInfo({ username: info.username, firstName: info.firstName });
      toast.success(`✅ বট ভেরিফাইড: ${info.firstName} (@${info.username})`);
    } catch (e: any) {
      setOtpBotInfo(null);
      toast.error(e?.message ?? "❌ OTP Bot Token সঠিক নয়!");
    } finally {
      setVerifyingOtpBot(false);
    }
  };

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow">
          <MessageCircle className="h-6 w-6 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display font-bold text-2xl">
            টেলিগ্রাম বট সেটিংস (২টি আলাদা বট)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            বট ১ আপনার নিজের সব অ্যাডমিন আপডেটের জন্য এবং বট ২ কাস্টমারদের লগইন ও পাসওয়ার্ড রিসেট OTP পাঠানোর জন্য
          </p>
        </div>
      </div>

      {/* =================================================================== */}
      {/* BOT 1: ADMIN UPDATES & NOTIFICATIONS BOT                            */}
      {/* =================================================================== */}
      <div className="glass-card rounded-2xl p-6 space-y-5 border border-primary/25">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary/15 px-2.5 py-1 text-xs font-bold text-primary mb-2">
              🔔 বট ১ — অ্যাডমিন আপডেট বট
            </span>
            <h2 className="font-bold text-lg">
              আপনার সব আপডেট পাওয়ার বট (Admin Notification Bot)
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              নতুন অর্ডার, পেমেন্ট সাবমিট, নতুন রেজিস্ট্রেশন ও সাপোর্ট টিকিটের সব আপডেট সরাসরি আপনার টেলিগ্রামে এই বট দিয়ে আসবে।
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">
              Admin Bot Token (বট ১-এর টোকেন)
            </label>
            <input
              type="text"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="যেমন: 7123456789:AAH..."
              className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              @BotFather থেকে আপনার অ্যাডমিন নোটিফিকেশন বটের টোকেন দিন
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">
              আপনার Admin Chat ID
            </label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="যেমন: 123456789"
              className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-primary/40"
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              @userinfobot এ মেসেজ পাঠালে আপনার নিজের numeric Chat ID পাবেন (এবং আপনার বটটি একবার Start করে রাখবেন)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={saveAdminBot}
            disabled={savingAdminBot}
            className="rounded-xl bg-green-600 hover:bg-green-700 px-5 py-2.5 font-bold text-sm text-white shadow-lg inline-flex items-center gap-2 disabled:opacity-60 transition"
          >
            {savingAdminBot ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            বট ১ (Admin Bot) সেভ করুন
          </button>

          <button
            onClick={sendAdminTest}
            disabled={testingAdminBot}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 px-5 py-2.5 font-bold text-sm text-white shadow-lg inline-flex items-center gap-2 disabled:opacity-60 transition"
          >
            {testingAdminBot ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            টেস্ট নোটিফিকেশন পাঠান
          </button>
        </div>
      </div>

      {/* =================================================================== */}
      {/* BOT 2: CUSTOMER LOGIN & PASSWORD RESET OTP BOT                      */}
      {/* =================================================================== */}
      <div className="glass-card rounded-2xl p-6 space-y-5 border border-sky-500/35">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500/15 px-2.5 py-1 text-xs font-bold text-sky-400 mb-2">
              🔐 বট ২ — কাস্টমার OTP বট (আলাদা বট)
            </span>
            <h2 className="font-bold text-lg">
              কাস্টমার লগইন ও পাসওয়ার্ড রিসেট OTP বট (Customer OTP Bot)
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              কাস্টমার যখন সাইটে Telegram দিয়ে লগইন করতে যাবে (Start চাপলেই অটো OTP) অথবা পাসওয়ার্ড রিসেট করতে Send OTP চাপবে, তখন এই ২য় বট থেকে কাস্টমারের কাছে ৬ সংখ্যার OTP যাবে।
            </p>
          </div>
          {otpBotInfo && (
            <a
              href={`https://t.me/${otpBotInfo.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/15 border border-sky-500/30 px-3 py-1.5 text-xs font-bold text-sky-400 hover:bg-sky-500/25 transition"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Active: @{otpBotInfo.username}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">
            Customer OTP Bot Token (বট ২-এর টোকেন)
          </label>
          <input
            type="text"
            value={otpBotToken}
            onChange={(e) => setOtpBotToken(e.target.value)}
            placeholder="আপনার ২য় বটের (OTP Bot) Telegram Bot Token এখানে দিন"
            className="w-full rounded-xl border border-border bg-transparent px-4 py-3 text-sm font-mono outline-none focus:ring-2 focus:ring-sky-500/40"
          />
          <p className="text-xs text-muted-foreground mt-1.5">
            @BotFather এ গিয়ে `/newbot` লিখে OTP-এর জন্য আলাদা বট তৈরি করুন এবং সেটির Token এখানে দিন। (এতে কোনো Chat ID লাগবে না, কারণ কাস্টমার বট Start করলেই সিস্টেম কাস্টমারের Chat ID অটোমেটিক নিয়ে নেবে!)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            onClick={saveCustomerOtpBot}
            disabled={savingOtpBot}
            className="rounded-xl bg-sky-600 hover:bg-sky-700 px-5 py-2.5 font-bold text-sm text-white shadow-lg inline-flex items-center gap-2 disabled:opacity-60 transition"
          >
            {savingOtpBot ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            বট ২ (OTP Bot) সেভ করুন
          </button>

          <button
            onClick={checkOtpBotNow}
            disabled={verifyingOtpBot}
            className="rounded-xl border border-border bg-secondary/40 hover:bg-secondary px-4 py-2.5 font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-60 transition"
          >
            {verifyingOtpBot ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4 text-sky-400" />
            )}
            বট যাচাই করুন
          </button>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-3">
        <h3 className="font-bold">কোন বট কোন কাজ করবে?</h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>
            🔔 <strong>বট ১ (Admin Bot):</strong> নতুন অর্ডার, পেমেন্ট সাবমিট, সাপোর্ট টিকিট ও নতুন সাইনআপের সব মেসেজ শুধু আপনাকে পাঠাবে।
          </li>
          <li>
            🔐 <strong>বট ২ (OTP Bot):</strong> কাস্টমাররা সাইটে Telegram Login বাটনে ক্লিক করে বট Start করলে সাথে সাথে ৬ সংখ্যার OTP পাঠাবে এবং পাসওয়ার্ড রিসেটে Send OTP চাপলে রিসেট কোড পাঠাবে।
          </li>
        </ul>
      </div>
    </div>
  );
}

