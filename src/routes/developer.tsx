import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Code2, Mail, Github, Globe, MessageCircle, ShieldCheck, Zap, Layers } from "lucide-react";
import { siteSettingsQuery } from "@/lib/site-settings";

export const Route = createFileRoute("/developer")({
  head: () => ({
    meta: [
      { title: "ডেভেলপার — Dev Sabbir Soft" },
      { name: "description", content: "DDS-Digital এর ডেভেলপার Dev Sabbir Soft সম্পর্কে জানুন।" },
      { property: "og:title", content: "Developer — Dev Sabbir Soft" },
      { property: "og:url", content: "/developer" },
    ],
    links: [{ rel: "canonical", href: "/developer" }],
  }),
  component: DeveloperPage,
});

function DeveloperPage() {
  const { data: settings = {} } = useQuery(siteSettingsQuery);
  const email = settings.contact_email || "support@ddsdigital.shop";
  const whatsapp = settings.whatsapp_number || "+880 1700-000000";

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="text-center">
        <div className="mx-auto h-24 w-24 sm:h-28 sm:w-28 rounded-3xl bg-gradient-brand grid place-items-center shadow-glow text-primary-foreground font-display font-bold text-4xl sm:text-5xl">
          DS
        </div>
        <h1 className="mt-5 sm:mt-6 font-display font-bold text-3xl sm:text-4xl">Dev Sabbir Soft</h1>
        <p className="mt-2 text-sm sm:text-base text-muted-foreground">Full-Stack Software Engineer · DDS-Digital এর নির্মাতা</p>
        <div className="mt-4 inline-block rounded-full glass px-4 py-1.5 text-xs font-medium">
          🇧🇩 Made in Bangladesh
        </div>
      </div>

      <div className="mt-8 sm:mt-10 glass-card rounded-3xl p-6 sm:p-8">
        <h2 className="font-display font-bold text-xl sm:text-2xl flex items-center gap-2">
          <Code2 className="h-6 w-6 text-primary" /> পরিচিতি ও লক্ষ্য
        </h2>
        <p className="mt-3 sm:mt-4 text-xs sm:text-sm leading-relaxed text-muted-foreground">
          আমি Dev Sabbir, একজন ফুল-স্ট্যাক সফটওয়্যার ডেভেলপার। বাংলাদেশের উদ্যোক্তা ও ডিজিটাল ক্রেতাদের জন্য দ্রুত, নিরাপদ ও আধুনিক ই-কমার্স সিস্টেম তৈরি করাই আমার লক্ষ্য। DDS-Digital হলো বাংলাদেশের অন্যতম পূর্ণাঙ্গ অটোমেটেড ডিজিটাল প্রোডাক্ট মার্কেটপ্লেস — যেখানে ১-ক্লিক চেকআউট, লাইভ অর্ডার ট্র্যাকিং এবং ইনস্ট্যান্ট ডেলিভারি সুবিধা যুক্ত করা হয়েছে।
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-border/60">
          {[
            { icon: Zap, title: "High Performance", sub: "SSR + Edge Caching" },
            { icon: ShieldCheck, title: "Enterprise Security", sub: "RLS + Verified Auth" },
            { icon: Layers, title: "Modern Stack", sub: "React 19 · TypeScript · Supabase" },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl glass p-3.5 flex items-center gap-3">
              <item.icon className="h-5 w-5 text-primary shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-bold truncate">{item.title}</div>
                <div className="text-[11px] text-muted-foreground truncate">{item.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid sm:grid-cols-2 gap-4">
        {[
          { icon: Mail, label: "ইমেইল", value: email },
          { icon: MessageCircle, label: "হোয়াটসঅ্যাপ সাপোর্ট", value: whatsapp },
          { icon: Globe, label: "অফিশিয়াল ওয়েবসাইট", value: "ddsdigital.shop" },
          { icon: Github, label: "ডেভেলপার প্রোফাইল", value: "Dev Sabbir Soft" },
        ].map((c) => (
          <div key={c.label} className="glass-card rounded-2xl p-4 sm:p-5 flex items-center gap-4">
            <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-brand grid place-items-center shadow-glow">
              <c.icon className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">{c.label}</div>
              <div className="text-sm font-semibold truncate">{c.value}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center">
        <Link to="/" className="text-sm font-semibold text-primary hover:underline">← হোমপেজে ফিরে যান</Link>
      </div>
    </div>
  );
}
