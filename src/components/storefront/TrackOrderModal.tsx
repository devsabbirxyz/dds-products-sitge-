import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  X,
  Search,
  PackageCheck,
  Clock,
  CheckCircle2,
  XCircle,
  FileDown,
  Copy,
  Check,
} from "lucide-react";
import { trackOrdersPublic } from "@/lib/orders.functions";
import { getOrderStatusMeta } from "@/lib/quick-order-utils";
import { formatBDT } from "@/lib/storefront";
import { downloadInvoicePDF } from "@/lib/invoice";
import { toast } from "sonner";

export interface TrackOrderModalProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export function TrackOrderModal({ open, onClose, initialQuery }: TrackOrderModalProps) {
  const searchOrders = useServerFn(trackOrdersPublic);
  const [query, setQuery] = useState(initialQuery ?? "");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const saved =
      initialQuery ||
      (() => {
        try {
          return localStorage.getItem("dds_last_order_number") || "";
        } catch {
          return "";
        }
      })();
    if (saved) {
      setQuery(saved);
      void runLookup(saved);
    }
  }, [open, initialQuery]);

  const runLookup = async (qStr: string) => {
    const trimmed = qStr.trim();
    if (trimmed.length < 3) {
      toast.error("অর্ডার নাম্বার (DDS-...) অথবা মোবাইল নাম্বার লিখুন");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await searchOrders({ data: { query: trimmed } });
      setOrders(res.orders ?? []);
    } catch (err: any) {
      toast.error(err?.message || "অর্ডার খুঁজতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="track-order-title"
    >
      <div className="relative w-full max-w-xl rounded-3xl border border-glass-border bg-card text-card-foreground shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-primary/15 via-secondary/10 to-transparent px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow">
              <PackageCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 id="track-order-title" className="font-display text-base sm:text-lg font-bold">
                লাইভ অর্ডার ট্র্যাকিং
              </h2>
              <p className="text-[11px] text-muted-foreground">
                লগইন ছাড়াই অর্ডার নাম্বার বা মোবাইল নাম্বার দিয়ে ডেলিভারি স্ট্যাটাস দেখুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 glass hover:bg-accent transition"
            aria-label="বন্ধ করুন"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void runLookup(query);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="অর্ডার আইডি (DDS-...) অথবা মোবাইল নাম্বার (017...)"
                className="w-full rounded-xl border border-border bg-background pl-10 pr-3 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-brand px-5 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground shadow-glow hover:opacity-95 transition shrink-0 disabled:opacity-50"
            >
              {loading ? "খোঁজা হচ্ছে..." : "ট্র্যাক করুন"}
            </button>
          </form>

          {searched && !loading && orders.length === 0 && (
            <div className="glass-card rounded-2xl p-8 text-center space-y-2">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
              <div className="font-semibold text-sm">কোনো অর্ডার পাওয়া যায়নি</div>
              <p className="text-xs text-muted-foreground">
                আপনার সঠিক অর্ডার আইডি (যেমন: DDS-...) অথবা অর্ডারে ব্যবহৃত মোবাইল নাম্বার দিয়ে আবার চেষ্টা করুন।
              </p>
            </div>
          )}

          {orders.length > 0 && (
            <div className="space-y-3">
              {orders.map((ord) => {
                const meta = getOrderStatusMeta(ord.status, ord.delivery_status);
                const toneClasses =
                  meta.tone === "emerald"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : meta.tone === "blue"
                      ? "bg-blue-500/15 text-blue-400 border-blue-500/30"
                      : meta.tone === "rose"
                        ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                        : "bg-amber-500/15 text-amber-400 border-amber-500/30";

                return (
                  <div
                    key={ord.id}
                    className="glass-card rounded-2xl p-4 border border-border/70 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-extrabold text-primary">
                            #{ord.order_number}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            · {new Date(ord.created_at).toLocaleDateString("bn-BD")}
                          </span>
                        </div>
                        <div className="font-display font-bold text-base mt-0.5">
                          {ord.product_title}
                          {ord.variant_label ? (
                            <span className="text-xs font-medium text-muted-foreground">
                              {" "}
                              ({ord.variant_label})
                            </span>
                          ) : null}
                        </div>
                      </div>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-bold inline-flex items-center gap-1 ${toneClasses}`}
                      >
                        {meta.step === 3 ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : meta.step === 0 ? (
                          <XCircle className="h-3.5 w-3.5" />
                        ) : (
                          <Clock className="h-3.5 w-3.5" />
                        )}
                        {meta.labelBn}
                      </span>
                    </div>

                    {/* 3-Step Visual Progress Bar */}
                    {meta.step > 0 && (
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        {[
                          { step: 1, label: "১. অর্ডার রিসিভড" },
                          { step: 2, label: "২. পেমেন্ট ভেরিফায়েড" },
                          { step: 3, label: "৩. ডেলিভারি সম্পন্ন" },
                        ].map((s) => {
                          const active = meta.step >= s.step;
                          return (
                            <div key={s.step} className="space-y-1">
                              <div
                                className={`h-1.5 rounded-full ${
                                  active ? "bg-gradient-brand" : "bg-muted"
                                }`}
                              />
                              <div
                                className={`text-[10px] font-semibold ${
                                  active ? "text-foreground" : "text-muted-foreground"
                                }`}
                              >
                                {s.label}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Delivered Credentials Box */}
                    {ord.delivery_content && (
                      <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-400">
                            ✓ আপনার ডেলিভারি ও অ্যাক্সেস তথ্য:
                          </span>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(ord.delivery_content);
                                setCopiedId(ord.id);
                                toast.success("ডেলিভারি তথ্য কপি হয়েছে");
                                setTimeout(() => setCopiedId(null), 2000);
                              } catch {}
                            }}
                            className="text-xs font-bold text-emerald-400 hover:underline inline-flex items-center gap-1"
                          >
                            {copiedId === ord.id ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                            কপি
                          </button>
                        </div>
                        <pre className="text-xs font-mono whitespace-pre-wrap break-all text-foreground bg-background/60 rounded-lg p-2.5">
                          {ord.delivery_content}
                        </pre>
                      </div>
                    )}

                    {ord.rejection_reason && (
                      <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 p-2.5 text-xs text-rose-300">
                        কারণ: {ord.rejection_reason}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-border/50 text-xs">
                      <div className="text-muted-foreground">
                        পেমেন্ট:{" "}
                        <strong className="text-foreground">
                          {formatBDT(ord.total_price)}
                        </strong>{" "}
                        · {ord.payment_method}
                        {ord.transaction_id ? ` (${ord.transaction_id})` : ""}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          downloadInvoicePDF({
                            order_number: ord.order_number,
                            product_title: ord.product_title || "Digital Product",
                            variant_label: ord.variant_label,
                            quantity: ord.quantity,
                            regular_price: ord.regular_price,
                            offer_price: ord.offer_price,
                            total_price: ord.total_price,
                            discount_amount: ord.discount_amount,
                            coupon_code: ord.coupon_code,
                            payment_method: ord.payment_method,
                            payment_type: ord.payment_type,
                            transaction_id: ord.transaction_id,
                            status: ord.status,
                            customer_name: ord.customer_name,
                            customer_email: ord.customer_email,
                            customer_phone: ord.customer_phone,
                            created_at: ord.created_at,
                          })
                        }
                        className="rounded-lg glass px-3 py-1.5 text-xs font-bold hover:bg-accent inline-flex items-center gap-1.5 transition"
                      >
                        <FileDown className="h-3.5 w-3.5 text-primary" /> ইনভয়েস PDF
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
