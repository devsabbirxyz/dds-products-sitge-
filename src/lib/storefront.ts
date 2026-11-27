// Client-side data queries for public storefront — uses Supabase RLS-allowed reads.
import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const productsQuery = (opts?: {
  category?: string | null;
  search?: string | null;
  sort?: "new" | "best" | "price_asc" | "price_desc";
  featured?: boolean;
  limit?: number;
  minPrice?: number | null;
  maxPrice?: number | null;
  badge?: "new" | "best" | "featured" | null;
}) =>
  queryOptions({
    queryKey: ["products", opts ?? {}],
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      let q = supabase
        .from("products")
        .select("id,slug,title,title_en,short_description,short_description_en,regular_price,offer_price,average_rating,total_sales,total_reviews,is_featured,is_new_arrival,is_best_seller,is_variant,view_count,category_id,created_at,track_stock,stock_quantity,product_images(image_url,is_main,sort_order),product_variants(regular_price,offer_price,is_active,stock_quantity)")
        .eq("is_active", true)
        .eq("status", "approved");

      if (opts?.featured) q = q.eq("is_featured", true);
      if (opts?.badge === "new") q = q.eq("is_new_arrival", true);
      if (opts?.badge === "best") q = q.eq("is_best_seller", true);
      if (opts?.badge === "featured") q = q.eq("is_featured", true);
      if (opts?.category) {
        const { data: cat } = await supabase.from("categories").select("id").eq("slug", opts.category).maybeSingle();
        if (cat) q = q.eq("category_id", cat.id);
      }
      if (opts?.search) q = q.ilike("title", `%${opts.search}%`);
      if (typeof opts?.minPrice === "number") q = q.gte("offer_price", opts.minPrice);
      if (typeof opts?.maxPrice === "number") q = q.lte("offer_price", opts.maxPrice);

      switch (opts?.sort) {
        case "best": q = q.order("total_sales", { ascending: false }); break;
        case "price_asc": q = q.order("offer_price", { ascending: true, nullsFirst: false }); break;
        case "price_desc": q = q.order("offer_price", { ascending: false, nullsFirst: false }); break;
      default:
        q = q.order("is_featured", { ascending: false });
        q = q.order("is_best_seller", { ascending: false });
        q = q.order("created_at", { ascending: false });
        break;
      }
      if (opts?.limit) q = q.limit(opts.limit);

      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

export const categoriesQuery = () =>
  queryOptions({
    queryKey: ["categories"],
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id,slug,name,name_en,icon_url,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const productBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["product", slug],
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(id,image_url,sort_order), product_variants(id,label,label_en,regular_price,offer_price,is_active,sort_order,stock_quantity), subscription_plans(id,name,name_en,price,duration_days,is_active,sort_order)")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const productReviewsQuery = (productId: string | undefined) =>
  queryOptions({
    queryKey: ["reviews", productId],
    enabled: !!productId,
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("reviews")
        .select("id,rating,review_text,created_at,user_id")
        .eq("product_id", productId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

export const productQuestionsQuery = (productId: string | undefined) =>
  queryOptions({
    queryKey: ["product_questions", productId],
    enabled: !!productId,
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("product_questions" as any)
        .select("id,user_name,question,answer,answered_at,created_at,user_id")
        .eq("product_id", productId)
        .eq("is_public", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return [];
      return (data ?? []) as any[];
    },
  });

export type FallbackBlogPost = {
  id: string;
  slug: string;
  title: string;
  title_en: string;
  short_description: string;
  short_description_en: string;
  thumbnail_url: string;
  published_at: string;
  updated_at?: string;
  view_count: number;
  is_featured: boolean;
  category: string;
  author_name: string;
  seo_title?: string;
  seo_description?: string;
  og_image?: string;
  content: string;
};

export const FALLBACK_BLOG_POSTS: FallbackBlogPost[] = [
  {
    id: "blog-fallback-1",
    slug: "chatgpt-plus-bangladesh-guide",
    title: "বাংলাদেশে বিকাশ ও নগদে ChatGPT Plus ও AI Tools কেনার সম্পূর্ণ গাইড",
    title_en: "Complete Guide to Buying ChatGPT Plus & AI Tools in Bangladesh via bKash & Nagad",
    short_description:
      "ডুয়াল কারেন্সি কার্ড ছাড়াই কীভাবে বাংলাদেশ থেকে শতভাগ নিরাপদে ChatGPT Plus, Gemini Advanced এবং প্রিমিয়াম AI সাবস্ক্রিপশন কিনবেন ও ব্যবহার করবেন তার বিস্তারিত গাইড।",
    short_description_en:
      "How to buy and use ChatGPT Plus, Gemini Advanced, and premium AI subscriptions in Bangladesh using bKash, Nagad, or Rocket without a dual-currency card.",
    thumbnail_url: "/banners/hero-ai-suite.svg",
    published_at: "2025-02-15T10:00:00.000Z",
    view_count: 1420,
    is_featured: true,
    category: "AI Tools & Guides",
    author_name: "DDS-Digital Team",
    content: `বর্তমান সময়ে ফ্রিল্যান্সিং, কন্টেন্ট রাইটিং, কোডিং কিংবা পড়াশোনার কাজে ChatGPT Plus (GPT-4o) এবং Google Gemini Advanced অপরিহার্য হয়ে উঠেছে। কিন্তু বাংলাদেশে অনেকেরই আন্তর্জাতিক ডুয়াল-কারেন্সি ক্রেডিট কার্ড না থাকায় সরাসরি সাবস্ক্রিপশন কেনা কঠিন হয়ে পড়ে।

১. কেন প্রিমিয়াম AI সাবস্ক্রিপশন ব্যবহার করবেন?
ফ্রি ভার্সনে প্রায়ই সার্ভার ব্যস্ত থাকে এবং নতুন মডেলগুলোর (যেমন GPT-4o, DALL·E 3 ইমেজ জেনারেশন, অ্যাডভান্সড ডাটা অ্যানালাইসিস ও ফাইল আপলোড) সম্পূর্ণ সুবিধা পাওয়া যায় না। প্রিমিয়াম সাবস্ক্রিপশনে আপনি পাবেন ৫ গুণ বেশি মেসেজ লিমিট, দ্রুত রেসপন্স এবং সব প্রো ফিচারের আনলিমিটেড অ্যাক্সেস।

২. বিকাশ, নগদ বা রকেটে কীভাবে কিনবেন?
DDS-Digital থেকে আপনি কোনো ক্রেডিট কার্ড ছাড়াই সরাসরি বিকাশ, নগদ বা রকেটের মাধ্যমে ১ মাস, ৬ মাস বা ১ বছরের প্ল্যান বেছে নিতে পারেন:
• প্রথমে শপ পেজ থেকে আপনার পছন্দের AI টুল এবং মেয়াদ (Variant) সিলেক্ট করুন।
• "এখনই কিনুন (১-ক্লিক বাই)" বাটনে ক্লিক করে বিকাশ বা নগদ নাম্বারে পেমেন্ট সম্পন্ন করুন।
• আপনার নাম, ফোন নাম্বার এবং TrxID দিয়ে অর্ডার সাবমিট করলেই ৫–১৫ মিনিটের মধ্যে আপনার ইমেইল ও অর্ডার ট্র্যাকিং পেজে অ্যাক্সেস পেয়ে যাবেন।

৩. ওয়ারেন্টি ও সাপোর্ট সুবিধা
আমাদের প্রতিটি প্রিমিয়াম সাবস্ক্রিপশনের সাথে থাকছে পূর্ণ মেয়াদের রিপ্লেসমেন্ট ওয়ারেন্টি এবং ২৪/৭ হোয়াটসঅ্যাপ ও AnyDesk সাপোর্ট।`,
  },
  {
    id: "blog-fallback-2",
    slug: "canva-pro-capcut-pro-freelancer-guide",
    title: "ফ্রিল্যান্সার ও কন্টেন্ট ক্রিয়েটরদের জন্য Canva Pro ও CapCut Pro কেন অপরিহার্য?",
    title_en: "Why Canva Pro & CapCut Pro Are Essential for Freelancers and Content Creators",
    short_description:
      "সোশ্যাল মিডিয়া ডিজাইন, ইউটিউব থাম্বনেইল এবং প্রফেশনাল রিলস/ভিডিও এডিটিংয়ে Canva Pro ও CapCut Pro কীভাবে আপনার কাজের গতি ১০ গুণ বাড়িয়ে দেয় তা জেনে নিন।",
    short_description_en:
      "Discover how Canva Pro and CapCut Pro speed up your design and video editing workflow 10x for YouTube, Facebook Reels, and freelance client projects.",
    thumbnail_url: "/banners/hero-creative-pro.svg",
    published_at: "2025-02-18T14:30:00.000Z",
    view_count: 985,
    is_featured: true,
    category: "Design & Editing",
    author_name: "DDS-Digital Team",
    content: `আপনি যদি গ্রাফিক ডিজাইন, ডিজিটাল মার্কেটিং বা ইউটিউব/ফেসবুক কন্টেন্ট ক্রিয়েশনের সাথে যুক্ত থাকেন, তবে Canva Pro এবং CapCut Pro আপনার সবচেয়ে বড় সহকারী হতে পারে।

১. Canva Pro-এর বিশেষ সুবিধাসমূহ:
• ১০০ মিলিয়নের বেশি প্রিমিয়াম স্টক ফটো, ভিডিও, অডিও এবং গ্রাফিক্স আনলক।
• ১-ক্লিক Background Remover এবং Magic Resize ফিচার।
• নিজের ইমেইল আইডিতেই অ্যাক্টিভেশন — তাই আপনার সব ডিজাইন সম্পূর্ণ প্রাইভেট ও নিরাপদ থাকে।

২. CapCut Pro দিয়ে প্রফেশনাল ভিডিও এডিটিং:
• ওয়াটারমার্ক ছাড়া 4K 60fps এক্সপোর্ট।
• প্রিমিয়াম ট্রানজিশন, AI অটো ক্যাপশন, ব্যাকগ্রাউন্ড রিমুভাল এবং কালার গ্রেডিং প্রিসেট।
• মোবাইল (Android/iOS) এবং পিসি (Windows/Mac) উভয় ডিভাইসেই ব্যবহারের সুবিধা।

DDS-Digital-এর কম্বো বান্ডেল অফারে আপনি Canva Pro, CapCut Pro এবং Envato Elements একসাথে নিলে পাচ্ছেন সর্বোচ্চ ১৮% পর্যন্ত অতিরিক্ত মূল্যছাড়!`,
  },
  {
    id: "blog-fallback-3",
    slug: "netflix-4k-nordvpn-streaming-tips",
    title: "টিভি ও মোবাইলে বাফারিং ছাড়া Netflix 4K এবং প্রিমিয়াম VPN ব্যবহারের নিয়মাবলী",
    title_en: "How to Use Netflix 4K UHD & Premium VPN on Smart TV and Mobile Without Buffering",
    short_description:
      "স্মার্ট টিভি, পিসি কিংবা মোবাইলে প্রাইভেট পিন-লক প্রোফাইলসহ Netflix 4K Ultra HD স্ট্রিমিং এবং NordVPN দিয়ে নিরাপদ ব্রাউজিং করার সেরা টিপস।",
    short_description_en:
      "Best tips for streaming Netflix 4K Ultra HD with a private PIN-locked profile and browsing securely with NordVPN across Smart TV, PC, and mobile.",
    thumbnail_url: "/banners/hero-streaming-vpn.svg",
    published_at: "2025-02-20T09:15:00.000Z",
    view_count: 1160,
    is_featured: true,
    category: "Streaming & Security",
    author_name: "DDS-Digital Team",
    content: `অবসর সময়ে পরিবার বা বন্ধুদের সাথে মুভি ও ওয়েব সিরিজ দেখার জন্য Netflix 4K Ultra HD সবারই পছন্দ। তবে শেয়ারড বা আনঅফিসিয়াল অ্যাকাউন্ট কিনলে অনেকেই হাউজহোল্ড এরর বা স্ক্রিন লিমিট সমস্যার মুখোমুখি হন।

১. আমাদের অফিশিয়াল Netflix 4K প্রোফাইলের সুবিধা:
• আলাদা প্রাইভেট প্রোফাইল এবং ব্যক্তিগত ৪-ডিজিট PIN Lock সুবিধা।
• Ultra HD (4K) রেজোলিউশন এবং ডলবি অ্যাটমস অডিও সাপোর্ট।
• স্মার্ট টিভি, ল্যাপটপ, পিসি ও স্মার্টফোনে ঝামেলামুক্ত স্ট্রিমিং।

২. কেন প্রিমিয়াম VPN (NordVPN) ব্যবহার করবেন?
ফ্রি ভিপিএন ব্যবহার করলে ইন্টারনেট স্পিড কমে যায় এবং ব্যক্তিগত ডাটা ঝুঁকিতে থাকে। NordVPN প্রিমিয়াম সাবস্ক্রিপশনে আপনি পাবেন ৬০+ দেশের সুপারফাস্ট সার্ভার, থ্রেট প্রোটেকশন এবং বাফারিং ছাড়া গ্লোবাল কন্টেন্ট দেখার সুবিধা।

যেকোনো সমস্যায় আমাদের ২৪/৭ লাইভ সাপোর্ট টিম সবসময় আপনার পাশে আছে।`,
  },
];

export const blogPostsQuery = (limit?: number, opts?: { featured?: boolean; category?: string | null }) =>
  queryOptions({
    queryKey: ["blog", limit ?? null, opts ?? {}],
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    queryFn: async () => {
      let q = supabase
        .from("blog_posts")
        .select("id,slug,title,title_en,short_description,short_description_en,thumbnail_url,published_at,view_count,is_featured,category,author_name")
        .eq("is_published", true)
        .order("published_at", { ascending: false, nullsFirst: false });
      if (opts?.featured) q = q.eq("is_featured", true);
      if (opts?.category) q = q.eq("category", opts.category);
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (!error && data && data.length > 0) return data;

      let fallback = FALLBACK_BLOG_POSTS.slice();
      if (opts?.featured) fallback = fallback.filter((p) => p.is_featured);
      if (opts?.category) fallback = fallback.filter((p) => p.category === opts.category);
      return limit ? fallback.slice(0, limit) : fallback;
    },
  });

export const blogCategoriesQuery = () =>
  queryOptions({
    queryKey: ["blog-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("category")
        .eq("is_published", true)
        .not("category", "is", null);
      const set = new Set<string>();
      if (!error && data && data.length > 0) {
        data.forEach((r: any) => r.category && set.add(r.category));
      } else {
        FALLBACK_BLOG_POSTS.forEach((p) => p.category && set.add(p.category));
      }
      return Array.from(set).sort();
    },
  });

export const blogPostBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["blog", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      if (!error && data) return data;
      return FALLBACK_BLOG_POSTS.find((p) => p.slug === slug) ?? null;
    },
  });

export const authorPostsQuery = (author: string) =>
  queryOptions({
    queryKey: ["blog-author", author],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select(
          "id,slug,title,thumbnail_url,short_description,published_at,view_count,category,author_name"
        )
        .eq("is_published", true)
        .eq("author_name", author)
        .order("published_at", { ascending: false, nullsFirst: false });
      if (!error && data && data.length > 0) return data;
      return FALLBACK_BLOG_POSTS.filter((p) => p.author_name === author);
    },
  });

export const relatedBlogPostsQuery = (opts: { excludeId: string; category?: string | null; limit?: number }) =>
  queryOptions({
    queryKey: ["blog-related", opts.excludeId, opts.category ?? null, opts.limit ?? 3],
    queryFn: async () => {
      let q = supabase
        .from("blog_posts")
        .select("id,slug,title,thumbnail_url,short_description,published_at,category,author_name")
        .eq("is_published", true)
        .neq("id", opts.excludeId)
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(opts.limit ?? 3);
      if (opts.category) q = q.eq("category", opts.category);
      const { data, error } = await q;
      if (!error && data && data.length > 0) return data;
      return FALLBACK_BLOG_POSTS.filter((p) => p.id !== opts.excludeId).slice(0, opts.limit ?? 3);
    },
  });

export const faqsQuery = () =>
  queryOptions({
    queryKey: ["faqs"],
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("id,question,question_en,answer,answer_en,sort_order,category_id, faq_categories(name,name_en)")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const reviewSlidesQuery = () =>
  queryOptions({
    queryKey: ["review_slides"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("review_slides")
        .select("id,image_url,sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(12);
      if (error) return [];
      return data ?? [];
    },
  });


export const pageBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("title,title_en,content,content_en,seo_title,seo_description")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export function formatBDT(n: number | null | undefined) {
  if (n == null) return "৳০";
  return "৳" + new Intl.NumberFormat("en-IN").format(Math.round(Number(n)));
}
