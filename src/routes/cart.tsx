import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Trash2, Minus, Plus, ShoppingCart, ArrowRight, Zap, ShieldCheck } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { formatBDT } from "@/lib/storefront";
import { QuickBuyModal } from "@/components/storefront/QuickBuyModal";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "কার্ট — DDS-Digital" }, { name: "robots", content: "noindex" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, subtotal, updateQty, removeItem, clear } = useCart();
  const { isAuthenticated } = useAuth();
  const nav = useNavigate();
  const [quickBuyOpen, setQuickBuyOpen] = useState(false);

  const goCheckout = () => {
    if (!isAuthenticated) nav({ to: "/login", search: { redirect: "/checkout" } as never });
    else nav({ to: "/checkout" });
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-16 text-center">
        <div className="mx-auto h-20 w-20 grid place-items-center rounded-3xl glass-card mb-4">
          <ShoppingCart className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="font-display font-bold text-3xl">আপনার কার্ট খালি</h1>
        <p className="mt-2 text-sm text-muted-foreground">আপনার পছন্দের প্রিমিয়াম ডিজিটাল প্রোডাক্ট বা বান্ডেল যোগ করতে শপে যান।</p>
        <Link to="/shop" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow hover:scale-105 transition">
          শপে যান <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const combinedTitle =
    items.length === 1
      ? items[0].title
      : `${items[0].title} + আরও ${items.length - 1}টি প্রোডাক্ট`;
  const combinedVariantLabel =
    items.length === 1
      ? items[0].variantLabel || items[0].planLabel || null
      : items.map((i) => `${i.title} (×${i.quantity})`).join(", ");

  return (
    <div className="mx-auto max-w-6xl px-3.5 sm:px-6 py-8 sm:py-10">
      <h1 className="font-display font-bold text-2xl sm:text-3xl mb-6">আপনার কার্ট ({items.length})</h1>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3.5 sm:space-y-4">
          {items.map((it) => (
            <div key={`${it.productId}-${it.variantId ?? ""}`} className="glass-card rounded-2xl p-3.5 sm:p-4 flex gap-3.5 sm:gap-4">
              <div className="h-18 w-18 sm:h-20 sm:w-20 shrink-0 rounded-xl overflow-hidden glass grid place-items-center">
                {it.image ? <img src={it.image} alt={it.title} className="h-full w-full object-cover" /> : <span className="font-display font-bold text-xl text-gradient-brand">{it.title.slice(0, 2)}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <Link to="/product/$slug" params={{ slug: it.slug }} className="font-semibold text-sm sm:text-base hover:text-primary line-clamp-1">{it.title}</Link>
                {it.variantLabel && <div className="text-xs text-muted-foreground mt-0.5">{it.variantLabel}</div>}
                <div className="mt-2.5 flex items-center justify-between flex-wrap gap-2">
                  <div className="inline-flex items-center gap-1 rounded-xl glass p-1">
                    <button onClick={() => updateQty(it.productId, it.quantity - 1, it.variantId)} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-accent" aria-label="কমান"><Minus className="h-3 w-3" /></button>
                    <span className="px-2 text-sm font-semibold min-w-6 text-center tabular-nums">{it.quantity}</span>
                    <button onClick={() => updateQty(it.productId, it.quantity + 1, it.variantId)} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-accent" aria-label="বাড়ান"><Plus className="h-3 w-3" /></button>
                  </div>
                  <div className="font-display font-bold text-base sm:text-lg text-gradient-brand tabular-nums">{formatBDT(it.price * it.quantity)}</div>
                </div>
              </div>
              <button onClick={() => removeItem(it.productId, it.variantId)} className="self-start rounded-lg p-2 hover:bg-accent text-muted-foreground hover:text-destructive transition" aria-label="Remove"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <button onClick={clear} className="text-xs text-muted-foreground hover:text-destructive transition">কার্ট খালি করুন</button>
        </div>

        <aside className="glass-card rounded-2xl p-5 sm:p-6 h-fit lg:sticky lg:top-24">
          <h2 className="font-display font-bold text-lg mb-4">অর্ডার সারমর্ম</h2>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">সাবটোটাল</span><span className="font-semibold tabular-nums">{formatBDT(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">ডেলিভারি চার্জ</span><span className="text-primary font-semibold">ফ্রি (ইনস্ট্যান্ট)</span></div>
            <div className="border-t border-border pt-2.5 mt-2 flex justify-between text-base">
              <span className="font-bold">সর্বমোট</span>
              <span className="font-display font-bold text-xl text-gradient-brand tabular-nums">{formatBDT(subtotal)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setQuickBuyOpen(true)}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-brand px-5 py-3.5 text-xs sm:text-sm font-bold text-primary-foreground shadow-glow hover:scale-[1.02] transition"
          >
            <Zap className="h-4 w-4" /> ১-ক্লিক কুইক চেকআউট (বিকাশ/নগদ)
          </button>

          <button
            type="button"
            onClick={goCheckout}
            className="mt-2.5 w-full inline-flex items-center justify-center gap-2 rounded-xl glass-card px-5 py-3 text-xs sm:text-sm font-semibold hover:bg-accent transition"
          >
            অ্যাকাউন্ট চেকআউট <ArrowRight className="h-4 w-4" />
          </button>

          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>১০০% নিরাপদ পেমেন্ট ও ৫–১৫ মিনিটে ডেলিভারি</span>
          </div>
        </aside>
      </div>

      <QuickBuyModal
        open={quickBuyOpen}
        onClose={() => setQuickBuyOpen(false)}
        product={{
          id: items[0].productId,
          title: combinedTitle,
          slug: items[0].slug,
          image_url: items[0].image ?? null,
          regular_price: subtotal,
          offer_price: subtotal,
        }}
        selectedVariant={
          combinedVariantLabel
            ? {
                id: items[0].variantId ?? "cart-bundle",
                label: combinedVariantLabel,
                regular_price: subtotal,
                offer_price: subtotal,
              }
            : null
        }
        quantity={1}
        onOpenTrackOrder={(orderNo) => {
          clear();
          window.dispatchEvent(new CustomEvent("dds:open-track-order", { detail: orderNo }));
        }}
      />
    </div>
  );
}
