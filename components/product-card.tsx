import Image from "next/image";
import Link from "next/link";
import { addToCart } from "@/app/cart/actions";
import { Badge, Button, Price, buttonClass } from "@/components/ui";
import { effectivePrice, stockStatus, type ProductCardData } from "@/lib/catalogue";
import { coverOf } from "@/lib/media";

const SIZES = "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw";

/**
 * Marketplace-style tile: big picture (a second photo on hover), brand, a two-line title,
 * the price with the saving, a plain stock line, and a one-tap "Add to cart".
 * The whole tile links to the product; the button sits above the link.
 */
export function ProductCard({ product: p }: { product: ProductCardData }) {
  const cover = coverOf(p.media);
  // The hover picture is the next photo that is not the cover.
  const hover = p.media.find((m) => m.kind === "IMAGE" && m.url !== cover?.url) ?? null;
  const hasVideo = p.media.some((m) => m.kind === "VIDEO");
  const status = stockStatus(p);
  const onSale = p.salePriceNgn != null && p.salePriceNgn < p.priceNgn;
  const percentOff = onSale ? Math.round(((p.priceNgn - p.salePriceNgn!) / p.priceNgn) * 100) : 0;
  const purchasable = !p.availableOnRequest && p.stock > 0;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-line bg-surface transition-[border-color,box-shadow] duration-200 ease-out hover:border-line-strong hover:shadow-md focus-within:border-solar-300 focus-within:shadow-md">
      <div className="relative aspect-square bg-surface">
        {cover ? (
          <>
            <Image
              src={cover.url}
              alt={cover.alt}
              fill
              sizes={SIZES}
              className={`object-contain p-4 transition-opacity duration-200 ${hover ? "group-hover:opacity-0" : ""}`}
            />
            {hover && (
              <Image
                src={hover.url}
                alt=""
                fill
                sizes={SIZES}
                className="object-contain p-4 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
              />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center bg-sunken px-4 text-center text-sm text-subtle">{p.category.name}</div>
        )}
        {percentOff > 0 && (
          <Badge tone="warning" variant="solid" className="absolute left-3 top-3">
            -{percentOff}%
          </Badge>
        )}
        {hasVideo && (
          <span className="absolute bottom-2 left-3 rounded-sm bg-chassis/85 px-2 py-0.5 text-xs font-semibold text-white">▶ Video</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 border-t border-line p-4">
        {p.brand && <p className="text-xs font-semibold uppercase tracking-wide text-muted">{p.brand.name}</p>}
        <h3 className="line-clamp-2 text-[0.9375rem] font-medium leading-snug text-strong">
          <Link href={`/products/${p.slug}`} className="after:absolute after:inset-0 hover:underline">
            {p.name}
          </Link>
        </h3>

        <div className="mt-1">
          <Price amount={effectivePrice(p)} was={onSale ? p.priceNgn : null} />
        </div>

        {/* Stock, in words: green when buyable, ember when nearly gone, plain when it is a question. */}
        <p className={`text-sm font-medium ${status.key === "in" ? "text-grid-800" : status.key === "low" ? "text-ember-700" : status.key === "out" ? "text-alert-700" : "text-muted"}`}>
          {status.key === "low" ? `Only ${p.stock} left in stock` : status.label}
        </p>
        <p className="text-xs text-muted">Free collection at our Alaba shop</p>

        <div className="relative z-10 mt-auto pt-3">
          {purchasable ? (
            <form action={addToCart}>
              <input type="hidden" name="productId" value={p.id} />
              <input type="hidden" name="quantity" value="1" />
              <Button type="submit" variant="outline" block>
                Add to cart
              </Button>
            </form>
          ) : (
            <Link href={`/products/${p.slug}`} className={buttonClass({ variant: "outline", block: true })}>
              {status.key === "out" ? "See details" : "Ask for a price"}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
