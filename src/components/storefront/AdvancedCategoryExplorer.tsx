import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Pause,
  Play,
  Zap,
} from "lucide-react";
import { CategoryAppIcon } from "@/components/storefront/CategoryAppIcons";
import {
  computeInfiniteScrollStep,
  enrichCategoriesWithProducts,
  formatBDT,
  type CategoryInput,
  type ExplorerProductInput,
} from "@/lib/category-explorer-utils";

interface AdvancedCategoryExplorerProps {
  categories: CategoryInput[];
  products: ExplorerProductInput[];
}

const COPIES_COUNT = 3;
const AUTO_SCROLL_SPEED_PX_PER_SEC = 46;

export function AdvancedCategoryExplorer({ categories, products }: AdvancedCategoryExplorerProps) {
  const enrichedCategories = useMemo(
    () => enrichCategoriesWithProducts(categories, products),
    [categories, products],
  );

  const marqueeItems = useMemo(() => {
    if (enrichedCategories.length === 0) return [];
    const list: Array<{
      item: (typeof enrichedCategories)[number];
      copyIdx: number;
    }> = [];
    for (let c = 0; c < COPIES_COUNT; c++) {
      for (const item of enrichedCategories) {
        list.push({ item, copyIdx: c });
      }
    }
    return list;
  }, [enrichedCategories]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const scrollPosRef = useRef<number>(0);
  const isInteractingRef = useRef<boolean>(false);
  const resumeTimerRef = useRef<number | null>(null);

  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragState = useRef({
    startX: 0,
    scrollLeft: 0,
    moved: false,
  });

  // Continuous Right-to-Left (ডান থেকে বামে) rAF auto-scroll loop
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || enrichedCategories.length === 0) return;

    if (scrollPosRef.current === 0 && el.scrollWidth > 0) {
      const oneSet = el.scrollWidth / COPIES_COUNT;
      scrollPosRef.current = oneSet;
      el.scrollLeft = oneSet;
    }

    let rafId = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(0.064, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      const container = scrollRef.current;
      if (
        container &&
        !isPaused &&
        !isHovered &&
        !isInteractingRef.current &&
        container.scrollWidth > container.clientWidth
      ) {
        const deltaPx = AUTO_SCROLL_SPEED_PX_PER_SEC * dt;
        const nextPos = computeInfiniteScrollStep({
          currentScrollLeft: scrollPosRef.current,
          totalScrollWidth: container.scrollWidth,
          copiesCount: COPIES_COUNT,
          deltaPx,
        });
        scrollPosRef.current = nextPos;
        container.scrollLeft = nextPos;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      if (resumeTimerRef.current !== null) {
        window.clearTimeout(resumeTimerRef.current);
      }
    };
  }, [enrichedCategories.length, isPaused, isHovered]);

  if (enrichedCategories.length === 0) return null;

  const pauseTemporarily = (ms = 1400) => {
    isInteractingRef.current = true;
    if (resumeTimerRef.current !== null) {
      window.clearTimeout(resumeTimerRef.current);
    }
    resumeTimerRef.current = window.setTimeout(() => {
      const el = scrollRef.current;
      if (el) {
        scrollPosRef.current = el.scrollLeft;
      }
      isInteractingRef.current = false;
    }, ms);
  };

  const scrollByAmount = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    pauseTemporarily(1600);

    const singleSetWidth = el.scrollWidth / COPIES_COUNT;
    if (direction === "left" && el.scrollLeft < singleSetWidth * 0.4) {
      el.scrollLeft += singleSetWidth;
      scrollPosRef.current = el.scrollLeft;
    } else if (direction === "right" && el.scrollLeft > singleSetWidth * 1.8) {
      el.scrollLeft -= singleSetWidth;
      scrollPosRef.current = el.scrollLeft;
    }

    const offset = direction === "left" ? -230 : 230;
    el.scrollBy({ left: offset, behavior: "smooth" });
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    isInteractingRef.current = true;
    setIsDragging(true);
    dragState.current = {
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
      moved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = x - dragState.current.startX;
    if (Math.abs(walk) > 6) {
      dragState.current.moved = true;
    }
    const next = computeInfiniteScrollStep({
      currentScrollLeft: dragState.current.scrollLeft - walk,
      totalScrollWidth: el.scrollWidth,
      copiesCount: COPIES_COUNT,
      deltaPx: 0,
    });
    el.scrollLeft = next;
    scrollPosRef.current = next;
  };

  const handleMouseUpOrLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      pauseTemporarily(900);
    }
  };

  return (
    <section
      id="category-explorer"
      data-testid="advanced-category-explorer"
      className="relative mx-auto max-w-7xl px-3.5 sm:px-6 pt-5 pb-3 sm:py-6 overflow-hidden"
    >
      {/* Slim Compact Header Bar */}
      <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-brand text-primary-foreground shadow-glow">
            <LayoutGrid className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </span>
          <h2 className="font-display font-bold text-base sm:text-lg tracking-tight text-foreground truncate">
            ক্যাটাগরি সমূহ
          </h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-400 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            অটো-স্ক্রল
          </span>
        </div>

        {/* Slim Controls */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            data-testid="category-autoscroll-toggle"
            onClick={() => setIsPaused((p) => !p)}
            aria-label={isPaused ? "অটো স্ক্রল চালু করুন" : "অটো স্ক্রল থামান"}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-card/85 hover:border-primary/50 text-foreground/85 transition active:scale-95 cursor-pointer"
          >
            {isPaused ? (
              <Play className="h-3 w-3 text-emerald-400 fill-emerald-400" />
            ) : (
              <Pause className="h-3 w-3 text-primary" />
            )}
          </button>

          <button
            type="button"
            data-testid="category-scroll-left"
            onClick={() => scrollByAmount("left")}
            aria-label="বামে স্ক্রল করুন"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-card/85 hover:border-primary/50 text-foreground/85 active:scale-95 transition cursor-pointer"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            data-testid="category-scroll-right"
            onClick={() => scrollByAmount("right")}
            aria-label="ডানে স্ক্রল করুন"
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border/80 bg-card/85 hover:border-primary/50 text-foreground/85 active:scale-95 transition cursor-pointer"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Slim Right-to-Left Auto-Scrolling Ribbon Strip */}
      <div className="relative">
        {/* Soft Left & Right Fade Edges */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-5 sm:w-10 bg-gradient-to-r from-background to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-5 sm:w-10 bg-gradient-to-l from-background to-transparent"
        />

        <div
          ref={scrollRef}
          data-testid="category-marquee-track"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            handleMouseUpOrLeave();
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onTouchStart={() => {
            isInteractingRef.current = true;
            if (resumeTimerRef.current !== null) {
              window.clearTimeout(resumeTimerRef.current);
            }
          }}
          onTouchEnd={() => pauseTemporarily(1200)}
          onScroll={(e) => {
            if (isInteractingRef.current) {
              scrollPosRef.current = e.currentTarget.scrollLeft;
            }
          }}
          className={`flex flex-nowrap items-center gap-2.5 sm:gap-3 overflow-x-auto no-scrollbar touch-pan-x py-1.5 px-1 select-none ${
            isDragging ? "cursor-grabbing" : "cursor-grab"
          }`}
        >
          {marqueeItems.map(({ item: cat, copyIdx }) => (
            <Link
              key={`${cat.id}-copy-${copyIdx}`}
              to="/shop"
              search={{ category: cat.slug }}
              draggable={false}
              data-testid={`category-card-${cat.slug}-${copyIdx}`}
              onClick={(e) => {
                if (dragState.current.moved) {
                  e.preventDefault();
                }
              }}
              style={{ backgroundImage: cat.glowCss }}
              className="group relative flex items-center gap-2.5 sm:gap-3 h-[58px] sm:h-[64px] w-[205px] sm:w-[238px] shrink-0 rounded-2xl border border-border/75 bg-card/85 hover:bg-card/95 hover:border-primary/60 px-2.5 sm:px-3 py-2 text-left transition-all duration-300 hover:-translate-y-0.5 shadow-[0_8px_22px_-10px_rgba(0,0,0,0.65)] overflow-hidden"
            >
              {/* Top Specular Accent Line */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-4 top-0 h-[1.5px] opacity-80 group-hover:opacity-100 transition-opacity"
                style={{
                  background: `linear-gradient(90deg, transparent, ${cat.accentHex}, transparent)`,
                }}
              />

              {/* Left: Advanced 3D Neon-Glass Category Icon */}
              <div className="relative shrink-0 transition-transform duration-300 group-hover:scale-108">
                <CategoryAppIcon
                  iconKey={cat.iconKey}
                  className="h-10 w-10 sm:h-11 sm:w-11 drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
                />
              </div>

              {/* Center: Category Name + Compact Price/Discount Meta */}
              <div className="min-w-0 flex-1">
                <h3 className="font-display font-bold text-xs sm:text-[13px] leading-tight text-foreground group-hover:text-primary transition-colors truncate">
                  {cat.name}
                </h3>

                <div className="mt-1 flex items-center gap-1.5 text-[10px] leading-none">
                  {cat.minPrice != null && cat.minPrice > 0 ? (
                    <span className="font-display font-bold text-gradient-brand whitespace-nowrap">
                      {formatBDT(cat.minPrice)} থেকে
                    </span>
                  ) : (
                    <span className="text-muted-foreground truncate">
                      {cat.productCount > 0 ? `${cat.productCount}টি প্রোডাক্ট` : "প্রিমিয়াম"}
                    </span>
                  )}

                  {cat.maxDiscountPercent > 0 && (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 text-[9px] font-extrabold text-emerald-400 shrink-0">
                      <Zap className="h-2 w-2 fill-emerald-400" />-{cat.maxDiscountPercent}%
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Micro Arrow Pill */}
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/12 border border-primary/25 text-primary group-hover:bg-gradient-brand group-hover:text-primary-foreground group-hover:border-transparent transition-all">
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
