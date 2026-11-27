import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, queryOptions, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { saveSetting } from "@/lib/admin.functions";
import { requestEmailOtpServer } from "@/lib/otp.functions";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { toast } from "sonner";
import { ShieldCheck, ArrowRight, MailCheck, Copy, Send } from "lucide-react";

const settingsQuery = queryOptions({
  queryKey: ["admin", "settings"],
  queryFn: async () => {
    const { data, error } = await supabase.from("site_settings").select("*");
    if (error) throw error;
    return data ?? [];
  },
});

const FIELDS = [
  { key: "site_name", label: "সাইট নাম", group: "general" },
  { key: "site_tagline", label: "ট্যাগলাইন", group: "general" },
  { key: "contact_email", label: "যোগাযোগ ইমেইল", group: "contact" },
  { key: "contact_phone", label: "যোগাযোগ ফোন", group: "contact" },
  { key: "whatsapp_number", label: "WhatsApp নম্বর", group: "contact" },
  { key: "facebook_url", label: "Facebook URL", group: "social" },
  { key: "youtube_url", label: "YouTube URL", group: "social" },
  { key: "telegram_url", label: "Telegram URL", group: "social" },
  { key: "footer_about", label: "Footer About Text", group: "general" },
];

const LOGO_KEYS = [
  { key: "site_logo_url", label: "সাইট Logo (Navbar)", group: "branding" },
  { key: "footer_logo_url", label: "Footer Logo", group: "branding" },
  { key: "site_favicon_url", label: "Favicon", group: "branding" },
];

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Settings — Admin" }, { name: "robots", content: "noindex" }] }),
  component: AdminSettings,
});

function AdminSettings() {
  const { data, isLoading } = useQuery(settingsQuery);
  const qc = useQueryClient();
  const save = useServerFn(saveSetting);
  const [values, setValues] = useState<Record<string, string>>({});
  const [savingLogo, setSavingLogo] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const map: Record<string, string> = {};
    for (const r of data) map[r.key] = r.value ?? "";
    setValues(map);
  }, [data]);

  if (isLoading || !data) return <div className="text-muted-foreground">Loading...</div>;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      for (const f of FIELDS) {
        await save({ data: { key: f.key, value: values[f.key] ?? "", group_name: f.group } });
      }
      toast.success("সংরক্ষিত");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const saveLogo = async (key: string, group: string, url: string) => {
    setValues((v) => ({ ...v, [key]: url }));
    setSavingLogo(key);
    try {
      await save({ data: { key, value: url, group_name: group } });
      toast.success("Logo আপডেট হয়েছে ✅");
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["site_settings"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingLogo(null); }
  };

  const saveField = async (key: string, value: string, group = "announcement") => {
    setValues((v) => ({ ...v, [key]: value }));
    try {
      await save({ data: { key, value, group_name: group } });
      qc.invalidateQueries({ queryKey: ["admin", "settings"] });
      qc.invalidateQueries({ queryKey: ["site_settings"] });
    } catch (e: any) { toast.error(e.message); }
  };

  const ann = {
    enabled: (values.announcement_enabled ?? "1") === "1",
    text: values.announcement_text ?? "",
    link: values.announcement_link ?? "",
    bg: values.announcement_bg || "#7c3aed",
    color: values.announcement_color || "#ffffff",
    scroll: (values.announcement_scroll ?? "1") === "1",
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display font-bold text-2xl">সাইট সেটিংস</h1>

      <Link
        to="/admin/admins"
        className="glass-card rounded-2xl p-5 flex items-center justify-between hover:shadow-glow transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow">
            <ShieldCheck className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold">Admin Role Management</div>
            <div className="text-xs text-muted-foreground mt-0.5">Admins, Super Admins, Moderators যোগ ও পরিচালনা করুন</div>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </Link>

      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div>
          <h2 className="font-bold text-lg">Branding / Logo</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Navbar ও Footer-এ দেখানো Logo পরিবর্তন করুন</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {LOGO_KEYS.map((l) => (
            <div key={l.key} className={savingLogo === l.key ? "opacity-60 pointer-events-none" : ""}>
              <ImageUpload
                label={l.label}
                value={values[l.key] ?? ""}
                onChange={(url) => saveLogo(l.key, l.group, url)}
                bucket="admin-uploads"
                folder="branding"
                maxSizeMB={2}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-lg">Announcement Bar</h2>
            <p className="text-xs text-muted-foreground mt-0.5">সাইটের উপরে দেখানো নোটিস বার</p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={ann.enabled}
              onChange={(e) => saveField("announcement_enabled", e.target.checked ? "1" : "0")}
              className="h-4 w-4"
            />
            শো করুন
          </label>
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Announcement টেক্সট</label>
          <input
            className="ip"
            value={ann.text}
            onChange={(e) => setValues({ ...values, announcement_text: e.target.value })}
            onBlur={(e) => saveField("announcement_text", e.target.value)}
            placeholder="যেমন: 🎉 সব প্রোডাক্টে ১০% ছাড়!"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">লিংক (ঐচ্ছিক)</label>
          <input
            className="ip"
            value={ann.link}
            onChange={(e) => setValues({ ...values, announcement_link: e.target.value })}
            onBlur={(e) => saveField("announcement_link", e.target.value)}
            placeholder="/shop বা https://..."
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">ব্যাকগ্রাউন্ড রঙ</label>
            <input type="color" className="h-10 w-full rounded-xl border border-border bg-transparent" value={ann.bg}
              onChange={(e) => saveField("announcement_bg", e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">টেক্সট রঙ</label>
            <input type="color" className="h-10 w-full rounded-xl border border-border bg-transparent" value={ann.color}
              onChange={(e) => saveField("announcement_color", e.target.value)} />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={ann.scroll} className="h-4 w-4"
                onChange={(e) => saveField("announcement_scroll", e.target.checked ? "1" : "0")} />
              স্ক্রলিং অ্যানিমেশন
            </label>
          </div>
        </div>
        <div className="rounded-xl p-3 text-sm" style={{ background: ann.bg, color: ann.color }}>
          প্রিভিউ: {ann.text || "(কোনো টেক্সট নেই)"}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-bold text-lg">WhatsApp Floating Button</h2>
            <p className="text-xs text-muted-foreground mt-0.5">ডেস্কটপে ডান-নিচে ভাসমান বাটন। মোবাইল বটম নেভিগেশনেও দেখাবে।</p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={(values.whatsapp_button_enabled ?? "1") === "1"}
              onChange={(e) => saveField("whatsapp_button_enabled", e.target.checked ? "1" : "0", "contact")}
              className="h-4 w-4"
            />
            শো করুন
          </label>
        </div>
        <p className="text-xs text-muted-foreground">WhatsApp নম্বর নিচের ফর্ম থেকে আপডেট করুন (যেমন: 8801XXXXXXXXX)।</p>
      </div>

      <div className="glass-card rounded-2xl p-6 space-y-5 border border-primary/25">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow shrink-0">
              <MailCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-lg">ফ্রি Custom Email OTP ভেরিফিকেশন (সার্ভার থেকে সরাসরি মেইল)</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Supabase ড্যাশবোর্ডে হাত না দিয়েই আমাদের সার্ভার থেকে ৬-সংখ্যার OTP মেইল পাঠান (Gmail SMTP / Google Apps Script / Resend — ১০০% ফ্রি)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const gasCode = `function doPost(e) {\n  var data = JSON.parse(e.postData.contents);\n  MailApp.sendEmail({\n    to: data.to,\n    subject: data.subject,\n    htmlBody: data.htmlBody,\n    name: data.siteName || "DDS-Digital"\n  });\n  return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);\n}`;
              navigator.clipboard.writeText(gasCode);
              toast.success("Google Apps Script কোড কপি হয়েছে! script.google.com এ পেস্ট করে Deploy ➔ Web App (Anyone) দিন।");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-xs font-semibold hover:bg-secondary transition"
          >
            <Copy className="h-3.5 w-3.5" />
            ফ্রি Gmail Apps Script কোড কপি করুন
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Gmail ঠিকানা (SMTP User — প্রতিদিন ৫০০ ফ্রি মেইল)</label>
            <input
              className="ip"
              placeholder="যেমন: developersabbir.biz@gmail.com"
              value={values.otp_smtp_user ?? ""}
              onChange={(e) => setValues({ ...values, otp_smtp_user: e.target.value })}
              onBlur={(e) => saveField("otp_smtp_user", e.target.value, "otp")}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Google 16-Digit App Password (SMTP Pass)</label>
            <input
              type="password"
              className="ip"
              placeholder="xxxx xxxx xxxx xxxx"
              value={values.otp_smtp_pass ?? ""}
              onChange={(e) => setValues({ ...values, otp_smtp_pass: e.target.value })}
              onBlur={(e) => saveField("otp_smtp_pass", e.target.value, "otp")}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">অথবা ফ্রি Google Apps Script Web App URL (কোনো পাসওয়ার্ড ছাড়াই ফ্রি Gmail)</label>
            <input
              className="ip"
              placeholder="https://script.google.com/macros/s/.../exec"
              value={values.otp_gas_webhook_url ?? ""}
              onChange={(e) => setValues({ ...values, otp_gas_webhook_url: e.target.value })}
              onBlur={(e) => saveField("otp_gas_webhook_url", e.target.value, "otp")}
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">অথবা Resend Free API Key (মাসে ৩,০০০ ফ্রি মেইল)</label>
            <input
              type="password"
              className="ip"
              placeholder="re_xxxxxxxxx"
              value={values.otp_resend_api_key ?? ""}
              onChange={(e) => setValues({ ...values, otp_resend_api_key: e.target.value })}
              onBlur={(e) => saveField("otp_resend_api_key", e.target.value, "otp")}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
          <div className="text-xs text-muted-foreground">
            💡 উপরের যেকোনো ১টি মেথড সেট করলেই কাস্টমারের মেইলে সরাসরি OTP যাবে। সেট করার পর নিচের বাটনে টেস্ট করুন:
          </div>
          <button
            type="button"
            onClick={async () => {
              const targetEmail = values.contact_email || values.otp_smtp_user || "developersabbir.biz@gmail.com";
              try {
                const res = await requestEmailOtpServer({
                  data: { email: targetEmail, fullName: "Admin Test", purpose: "test" },
                });
                if (res.sandboxCode) {
                  toast.info(`টেস্ট OTP তৈরি হয়েছে (${res.sandboxCode}) — মেইলে পাঠাতে উপরে Gmail App Password বা Apps Script URL দিন।`);
                } else {
                  toast.success(`✅ ${targetEmail} ঠিকানায় টেস্ট OTP মেইল সফলভাবে পাঠানো হয়েছে (${res.deliveredVia})!`);
                }
              } catch (err: any) {
                toast.error(err?.message || "টেস্ট OTP পাঠাতে সমস্যা হয়েছে");
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow"
          >
            <Send className="h-3.5 w-3.5" />
            টেস্ট OTP মেইল পাঠান
          </button>
        </div>
      </div>

      <form onSubmit={submit} className="glass-card rounded-2xl p-6 space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-xs text-muted-foreground mb-1">{f.label}</label>
            <input className="ip" value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
          </div>
        ))}
        <button className="rounded-xl bg-gradient-brand px-6 py-3 font-bold text-primary-foreground shadow-glow">সংরক্ষণ করুন</button>
      </form>
      <style>{`.ip{width:100%;border-radius:0.75rem;border:1px solid var(--border);background:transparent;padding:0.7rem 0.9rem;font-size:0.875rem}`}</style>
    </div>
  );
}
