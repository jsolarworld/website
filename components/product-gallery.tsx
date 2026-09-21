"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { videoPoster, videoSrc, type MediaItem } from "@/lib/media";

/**
 * Product pictures: one large viewer, with a thumbnail strip beside it (below on phones).
 * Photos zoom-free and sharp; videos play in place with controls and a still frame first.
 */
export function ProductGallery({ media, name }: { media: MediaItem[]; name: string }) {
  const [active, setActive] = useState(0);
  const current = media[active];

  if (media.length === 0) {
    return <div className="flex aspect-square items-center justify-center rounded-lg border border-line bg-sunken text-subtle">Photo coming soon</div>;
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-line bg-surface">
        {current.kind === "VIDEO" ? (
          // key: switching clips must remount, or the browser keeps playing the old one.
          <video
            key={current.url}
            className="size-full bg-chassis object-contain"
            controls
            playsInline
            preload="metadata"
            poster={videoPoster(current.url)}
            aria-label={current.alt || `${name} video`}
          >
            <source src={videoSrc(current.url)} />
            Your browser cannot play this video.
          </video>
        ) : (
          <Image src={current.url} alt={current.alt} fill priority={active === 0} sizes="(min-width: 1024px) 45vw, 100vw" className="object-contain p-4" />
        )}
      </div>

      {media.length > 1 && (
        <ul className="flex gap-2 overflow-x-auto lg:max-h-[34rem] lg:flex-col lg:overflow-y-auto lg:overflow-x-visible" aria-label="Product pictures">
          {media.map((m, i) => (
            <li key={m.url} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`${m.kind === "VIDEO" ? "Play video" : "Show photo"} ${i + 1}: ${m.alt}`}
                aria-current={i === active}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-md border bg-surface sm:size-[4.5rem]",
                  i === active ? "border-navy-600 ring-2 ring-navy-600/30" : "border-line hover:border-line-strong",
                )}
              >
                <Image src={m.kind === "VIDEO" ? videoPoster(m.url) : m.url} alt="" fill sizes="72px" className="object-contain p-1" />
                {m.kind === "VIDEO" && (
                  <span aria-hidden className="absolute inset-0 grid place-items-center bg-chassis/35 text-sm text-white">▶</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
