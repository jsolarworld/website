import Image from "next/image";
import Link from "next/link";
import { Badge, Card, CardBody, Eyebrow, Price } from "@/components/ui";
import { effectivePrice, stockStatus, type ProductCardData } from "@/lib/catalogue";

const TONE = { in: "positive", low: "warning", out: "danger", request: "neutral" } as const;

export function ProductCard({ product: p }: { product: ProductCardData }) {
  const img = p.images[0];
  const status = stockStatus(p);
  const onSale = p.salePriceNgn != null && p.salePriceNgn < p.priceNgn;
  return (
    <Card interactive className="flex h-full flex-col overflow-hidden">
      <div className="relative aspect-[4/3] bg-sunken">
        {img ? (
          <Image
            src={img.url}
            alt={img.alt}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain p-3"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-subtle">
            {p.category.name}
          </div>
        )}
        {onSale && (
          <Badge tone="warning" variant="solid" className="absolute left-3 top-3">
            Sale
          </Badge>
        )}
      </div>
      <CardBody className="flex flex-1 flex-col gap-2">
        {p.brand && <Eyebrow>{p.brand.name}</Eyebrow>}
        <h3 className="text-subtitle">
          <Link href={`/products/${p.slug}`} className="after:absolute after:inset-0">
            {p.name}
          </Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <Price amount={effectivePrice(p)} was={onSale ? p.priceNgn : null} />
          <Badge tone={TONE[status.key]} dot>
            {status.label}
          </Badge>
        </div>
      </CardBody>
    </Card>
  );
}
