import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  X,
  Zap,
  Copy,
  Check,
  ShieldCheck,
  FileDown,
  CheckCircle2,
  Phone,
  User,
  Mail,
  Hash,
  Search,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatBDT } from "@/lib/storefront";
import { placeQuickOrder } from "@/lib/orders.functions";
import {
  calculateQuickOrderTotals,
  isValidCustomerPhone,
  isValidTrxId,
  normalizeBdPhone,
  normalizeTrxId,
} from "@/lib/quick-order-utils";
import { downloadInvoicePDF } from "@/lib/invoice";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export interface QuickBuyModalProps {
  open: boolean;
  onClose: () => void;
  product: {
    id: string;
    title: string;
    slug: string;
    image_url?: string | null;
    regular_price?: number | null;
    offer_price?: number | null;
  };
  selectedVariant?: {
    id: string;
    label: string;
    regular_price?: number | null;
    offer_price?: number | null;
  } | null;
  quantity: number;
  onOpenTrackOrder?: (orderNumber: string) => void;
}

export function QuickBuyModal({
  open,
  onClose,
  product,
  selectedVariant,
  quantity,
  onOpenTrackOrder,
}: QuickBuyModalProps) {
  const { user } = useAuth();
  const submitQuickOrder = useServerFn(placeQuickOrder);

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment_methods", "manual_active"],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_methods")
        .select("id,name,name_en,account_number,account_type,send_type,instructions,is_manual_active,sort_order")
        .eq("is_manual_active", true)
        .order("sort_order", { ascending: true });
      if (error) return [];
      return data ?? [];
    },
  });

  const [selectedPmId, setSelectedPmId] = useState<string>("");
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedOrderNo, setCopiedOrderNo] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [customerInput, setCustomerInput] = useState("");
  const [trxId, setTrxId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedPmId) {
      setSelectedPmId(paymentMethods[0].id);
    }
  }, [paymentMethods, selectedPmId]);

  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user, email]);

  if (!open) return null;

  const activePm = paymentMethods.find((m: any) => m.id === selectedPmId) ?? paymentMethods[0];
  const totals = calculateQuickOrderTotals({
    unitRegularPrice: selectedVariant?.regular_price ?? product.regular_price,
    unitOfferPrice: selectedVariant?.offer_price ?? product.offer_price,
    quantity,
  });

  const handleCopyNumber = async (num: string) => {
    try {
      await navigator.clipboard.writeText(num);
      setCopiedNumber(true);
      toast.success("পেমেন্ট নাম্বার কপি হয়েছে!");
      setTimeout(() => setCopiedNumber(false), 2500);
    } catch {
      toast.info(`নাম্বার: ${num}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("আপনার নাম লিখুন");
      return;
    }
    if (!isValidCustomerPhone(phone)) {
      toast.error("সঠিক মোবাইল নাম্বার দিন (যেমন: 017XXXXXXXX)");
      return;
    }
    if (!activePm?.id) {
      toast.error("পেমেন্ট মেথড নির্বাচন করুন");
      return;
    }
    if (!isValidTrxId(trxId)) {
      toast.error("সঠিক Transaction ID (TrxID) লিখুন");
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitQuickOrder({
        data: {
          productId: product.id,
          variantId: selectedVariant?.id ?? null,
          quantity: totals.quantity,
          paymentMethodId: activePm.id,
          transactionId: normalizeTrxId(trxId),
          userId: user?.id ?? null,
          customer: {
            name: name.trim(),
            phone: normalizeBdPhone(phone),
            email: email.trim() || null,
            input: customerInput.trim() || null,
          },
        },
      });
      setCompletedOrder(res);
      try {
        localStorage.setItem("dds_last_order_number", res.orderNumber);
      } catch {}
      toast.success("অর্ডার সফলভাবে সম্পন্ন হয়েছে!");
    } catch (err: any) {
      toast.error(err?.message || "অর্ডার প্লেস করতে সমস্যা হয়েছে");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-buy-title"
    >
      <div className="relative w-full max-w-lg rounded-3xl border border-glass-border bg-card text-card-foreground shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-border/60 bg-gradient-to-r from-primary/15 via-secondary/10 to-transparent px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-primary-foreground shadow-glow">
              <Zap className="h-5 w-5" />
            </div>
            <div>
              <h2 id="quick-buy-title" className="font-display text-base sm:text-lg font-bold">
                ১-ক্লিক কুইক চেকআউট
              </h2>
              <p className="text-[11px] text-muted-foreground">
                রেজিস্ট্রেশন ছাড়াই ১ মিনিটে অর্ডার ও ইনস্ট্যান্ট পিডিএফ রিসিট
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
        <div className="overflow-y-auto p-5 space-y-4">
          {completedOrder ? (
            <div className="text-center py-3 space-y-4">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <div>
                <span className="inline-block rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-400">
                  অর্ডার রিসিভড · ৫–১৫ মিনিটে ডেলিভারি
                </span>
                <h3 className="mt-2 font-display text-2xl font-bold">
                  ধন্যবাদ, {completedOrder.customerName}!
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  আপনার অর্ডার নাম্বার নিচে দেওয়া হলো। এটি সংরক্ষণ করুন:
                </p>
              </div>

              <div className="glass-card rounded-2xl p-4 flex items-center justify-between gap-3 border border-primary/30">
                <div className="text-left">
                  <div className="text-[11px] text-muted-foreground">অর্ডার আইডি (Order ID)</div>
                  <div className="font-mono text-lg font-extrabold text-primary">
                    #{completedOrder.orderNumber}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(completedOrder.orderNumber);
                      setCopiedOrderNo(true);
                      toast.success("অর্ডার নাম্বার কপি হয়েছে");
                      setTimeout(() => setCopiedOrderNo(false), 2000);
                    } catch {}
                  }}
                  className="rounded-xl bg-primary/15 hover:bg-primary/25 text-primary px-3.5 py-2 text-xs font-bold inline-flex items-center gap-1.5 transition"
                >
                  {copiedOrderNo ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedOrderNo ? "কপি হয়েছে" : "কপি করুন"}
                </button>
              </div>

              <div className="glass rounded-2xl p-4 text-left text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">প্রোডাক্ট:</span>
                  <span className="font-semibold text-right">
                    {completedOrder.productTitle}
                    {completedOrder.variantLabel ? ` (${completedOrder.variantLabel})` : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">মোট পেমেন্ট:</span>
                  <span className="font-bold text-primary">{formatBDT(completedOrder.totalPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">পেমেন্ট মেথড ও TrxID:</span>
                  <span className="font-mono font-semibold">
                    {completedOrder.paymentMethod} · {completedOrder.transactionId}
                  </span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadInvoicePDF({
                      order_number: completedOrder.orderNumber,
                      product_title: completedOrder.productTitle,
                      variant_label: completedOrder.variantLabel,
                      quantity: completedOrder.quantity,
                      regular_price: completedOrder.regularPrice,
                      offer_price: completedOrder.unitPrice,
                      total_price: completedOrder.totalPrice,
                      payment_method: completedOrder.paymentMethod,
                      payment_type: "manual",
                      transaction_id: completedOrder.transactionId,
                      status: "pending",
                      customer_name: completedOrder.customerName,
                      customer_email: completedOrder.customerEmail,
                      customer_phone: completedOrder.customerPhone,
                      created_at: completedOrder.createdAt,
                    })
                  }
                  className="rounded-xl bg-gradient-brand px-4 py-3 text-xs font-bold text-primary-foreground shadow-glow inline-flex items-center justify-center gap-2"
                >
                  <FileDown className="h-4 w-4" /> পিডিএফ রিসিট ডাউনলোড
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const ordNo = completedOrder.orderNumber;
                    onClose();
                    onOpenTrackOrder?.(ordNo);
                  }}
                  className="rounded-xl glass-card px-4 py-3 text-xs font-bold hover:bg-accent inline-flex items-center justify-center gap-2"
                >
                  <Search className="h-4 w-4 text-primary" /> লাইভ অর্ডার ট্র্যাক করুন
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Product Summary Bar */}
              <div className="glass-card rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="h-12 w-12 rounded-xl object-cover shrink-0 border border-border/50"
                    />
                  )}
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{product.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {selectedVariant ? selectedVariant.label : "স্ট্যান্ডার্ড প্যাক"} × {totals.quantity}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-extrabold text-lg text-gradient-brand">
                    {formatBDT(totals.subtotal)}
                  </div>
                  {totals.savings > 0 && (
                    <div className="text-[11px] text-emerald-400 font-semibold">
                      সাশ্রয় {formatBDT(totals.savings)}
                    </div>
                  )}
                </div>
              </div>

              {/* Step 1: Select Payment Method (bKash / Nagad / Rocket) */}
              <div>
                <label className="block text-xs font-bold mb-2">
                  ১. পেমেন্ট মাধ্যম নির্বাচন করুন (Send Money)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {paymentMethods.map((pm: any) => {
                    const active = pm.id === (activePm?.id ?? "");
                    return (
                      <button
                        type="button"
                        key={pm.id}
                        onClick={() => setSelectedPmId(pm.id)}
                        className={`rounded-xl px-3 py-2.5 text-xs font-bold transition border text-center ${
                          active
                            ? "bg-gradient-brand text-primary-foreground border-transparent shadow-glow"
                            : "glass hover:bg-accent border-border/60"
                        }`}
                      >
                        {pm.name}
                      </button>
                    );
                  })}
                </div>

                {activePm && (
                  <div className="mt-2.5 rounded-2xl bg-primary/10 border border-primary/25 p-3.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="text-[11px] text-muted-foreground">
                          {activePm.name} ({activePm.account_type || "Personal"}) নাম্বারে{" "}
                          <strong className="text-foreground">{formatBDT(totals.subtotal)}</strong> Send Money করুন:
                        </div>
                        <div className="mt-0.5 font-mono text-base sm:text-lg font-extrabold tracking-wide text-primary">
                          {activePm.account_number}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyNumber(activePm.account_number)}
                        className="rounded-xl bg-primary text-primary-foreground px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm hover:opacity-95 transition"
                      >
                        {copiedNumber ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                        {copiedNumber ? "কপি হয়েছে" : "নাম্বার কপি"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Customer Info & TrxID */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">আপনার নাম *</label>
                  <div className="relative">
                    <User className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="আপনার নাম"
                      className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">মোবাইল নাম্বার (WhatsApp) *</label>
                  <div className="relative">
                    <Phone className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    ডেলিভারি ইমেইল (যে মেইলে প্রোডাক্ট নিবেন)
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="yourname@gmail.com"
                      className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Transaction ID (TrxID) / শেষ ৪ ডিজিট *
                  </label>
                  <div className="relative">
                    <Hash className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                      placeholder="যেমন: BK94X82M"
                      className="w-full rounded-xl border border-primary/50 bg-background pl-9 pr-3 py-2.5 text-sm font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  অতিরিক্ত নোট / অ্যাকাউন্ট ইনফো (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={customerInput}
                  onChange={(e) => setCustomerInput(e.target.value)}
                  placeholder="যেমন: Canva/Gemini ইনভাইটের জন্য আপনার Gmail বা বিশেষ কোনো নির্দেশনা"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl bg-gradient-brand py-3.5 text-sm font-extrabold text-primary-foreground shadow-glow hover:scale-[1.01] transition inline-flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Zap className="h-4 w-4" />
                {submitting
                  ? "অর্ডার কনফার্ম হচ্ছে..."
                  : `অর্ডার কনফার্ম করুন · ${formatBDT(totals.subtotal)}`}
              </button>

              <div className="flex items-center justify-center gap-4 text-[11px] text-muted-foreground pt-1">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> ১০০% ওয়ারেন্টি গ্যারান্টি
                </span>
                <span>•</span>
                <span>ইনস্ট্যান্ট পিডিএফ ইনভয়েস</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
