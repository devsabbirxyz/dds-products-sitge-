import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Bundle = {
  id: string;
  title: string;
  title_en: string | null;
  description: string | null;
  discount_percent: number;
  is_active: boolean;
  sort_order: number;
  image_url: string | null;
  items: Array<{
    id: string;
    product_id: string;
    sort_order: number;
    product: {
      id: string;
      title: string;
      slug: string;
      regular_price: number | null;
      offer_price: number | null;
      product_images: Array<{ image_url: string }> | null;
    } | null;
  }>;
};

export const bundlesQuery = () =>
  queryOptions({
    queryKey: ["bundles", "active"],
    staleTime: 60_000,
    queryFn: async (): Promise<Bundle[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from("bundles")
          .select(`
            id,title,title_en,description,discount_percent,is_active,sort_order,image_url,
            items:bundle_items(
              id,product_id,sort_order,
              product:products(id,title,slug,regular_price,offer_price,product_images(image_url))
            )
          `)
          .eq("is_active", true)
          .order("sort_order", { ascending: true });
        if (!error && Array.isArray(data) && data.length > 0) {
          return data as Bundle[];
        }
      } catch {
        // Fallback to curated combo bundles from active products
      }

      const { data: prods } = await supabase
        .from("products")
        .select("id,title,slug,regular_price,offer_price,product_images(image_url)")
        .eq("is_active", true)
        .eq("status", "approved")
        .limit(12);

      const list = (prods ?? []) as any[];
      if (list.length < 2) return [];

      const bySlug = (slugPart: string) =>
        list.find((p) => String(p.slug || "").includes(slugPart));

      const gpt = bySlug("chatgpt") || list[0];
      const canva = bySlug("canva") || list[1];
      const grammarly = bySlug("grammarly") || list[2] || list[0];
      const capcut = bySlug("capcut") || list[2] || list[1];
      const envato = bySlug("envato") || list[3] || list[0];
      const netflix = bySlug("netflix") || list[3] || list[0];
      const nord = bySlug("nordvpn") || list[4] || list[1];

      const makeBundle = (
        id: string,
        title: string,
        title_en: string,
        description: string,
        discount_percent: number,
        sort_order: number,
        products: any[],
      ): Bundle => {
        const unique = Array.from(new Map(products.filter(Boolean).map((p) => [p.id, p])).values());
        return {
          id,
          title,
          title_en,
          description,
          discount_percent,
          is_active: true,
          sort_order,
          image_url: null,
          items: unique.map((p, idx) => ({
            id: `${id}-item-${idx}`,
            product_id: p.id,
            sort_order: idx,
            product: {
              id: p.id,
              title: p.title,
              slug: p.slug,
              regular_price: p.regular_price,
              offer_price: p.offer_price,
              product_images: p.product_images ?? [],
            },
          })),
        };
      };

      return [
        makeBundle(
          "combo-student-pack",
          "স্টুডেন্ট ও ফ্রিল্যান্সার AI সুপার প্যাক",
          "Student & Freelancer AI Super Pack",
          "ChatGPT Plus + Canva Pro + Grammarly Pro একসাথে নিলেই অতিরিক্ত ১৫% বান্ডেল ছাড়!",
          15,
          1,
          [gpt, canva, grammarly],
        ),
        makeBundle(
          "combo-creator-pack",
          "কনটেন্ট ক্রিয়েটর ও এডিটর প্রো বান্ডেল",
          "Content Creator & Editor Pro Bundle",
          "CapCut Pro + Canva Pro + Envato Elements — ইউটিউবার ও ডিজাইনারদের কমপ্লিট প্যাক!",
          18,
          2,
          [capcut, canva, envato],
        ),
        makeBundle(
          "combo-entertainment-pack",
          "৪কে স্ট্রিমিং ও প্রাইভেসি কম্বো",
          "4K Streaming & Privacy Combo",
          "Netflix 4K Ultra HD + NordVPN প্রিমিয়াম কম্বো প্যাকে ১২% বিশেষ ছাড়!",
          12,
          3,
          [netflix, nord],
        ),
      ].filter((b) => b.items.length >= 2);
    },
  });

// ---------- Admin ----------
export const listBundles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { data, error } = await supabase
      .from("bundles")
      .select(`
        *,
        items:bundle_items(
          id,product_id,sort_order,
          product:products(id,title)
        )
      `)
      .order("sort_order", { ascending: true });
    if (error) throw new Error(error.message);
    return { bundles: data ?? [] };
  });

export const saveBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid().optional(),
      title: z.string().min(1).max(200),
      title_en: z.string().max(200).nullish(),
      description: z.string().max(2000).nullish(),
      discount_percent: z.number().min(0).max(100),
      is_active: z.boolean(),
      sort_order: z.number().int(),
      image_url: z.string().nullish(),
      product_ids: z.array(z.string().uuid()).min(2).max(10),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) throw new Error("Forbidden");

    let bundleId = data.id;
    const payload = {
      title: data.title,
      title_en: data.title_en ?? null,
      description: data.description ?? null,
      discount_percent: data.discount_percent,
      is_active: data.is_active,
      sort_order: data.sort_order,
      image_url: data.image_url ?? null,
    };

    if (bundleId) {
      const { error } = await supabase.from("bundles").update(payload).eq("id", bundleId);
      if (error) throw new Error(error.message);
    } else {
      const { data: ins, error } = await supabase.from("bundles").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      bundleId = ins.id;
    }

    // Replace items
    await supabase.from("bundle_items").delete().eq("bundle_id", bundleId);
    const rows = data.product_ids.map((pid, idx) => ({
      bundle_id: bundleId,
      product_id: pid,
      sort_order: idx,
    }));
    const { error: itErr } = await supabase.from("bundle_items").insert(rows);
    if (itErr) throw new Error(itErr.message);

    return { ok: true, id: bundleId };
  });

export const deleteBundle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const { data: isAdmin } = await supabase.rpc("is_admin", { _user_id: userId });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await supabase.from("bundles").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
