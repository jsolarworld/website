"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import { videoPoster, videoSrc, type MediaItem } from "@/lib/media";

/** How long a photo stays before the next picture. */
const PHOTO_MS = 5000;
/** A video normally moves on when it ends; this stops one that never plays (blocked or stalled) holding the slideshow. */
const VIDEO_CAP_MS = 30000;

const REDUCED = "(prefers-reduced-motion: reduce)";

/** True when the device asks for less motion. Assumed true on the server so nothing autoplays before we know. */
function useReducedMotion() {
  return useSyncExternalStore(
    (notify) => {
      const q = window.matchMedia(REDUCED);
      q.addEventListener("change", notify);
      return () => q.removeEventListener("change", notify);
    },
    () => window.matchMedia(REDUCED).matches,
    () => true,
  );
}

/**
 * Product pictures: one large viewer with a thumbnail strip beside it (below on phones).
 * It plays like a slideshow: photos change every 5 seconds, and a video starts by itself (muted) and
 * hands over when it ends. Touching a thumbnail, or hovering or focusing the viewer, stops the slideshow so
 * nobody is moved on while they are looking. People who ask their device for reduced motion get no autoplay.
 */
export function ProductGallery({ media, name }: { media: MediaItem[]; name: string }) {
  const [active, setActive] = useState(0);
  const [manual, setManual] = useState(false);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const current = media[active];
  const many = media.length > 1;
  const auto = many && !manual && !paused && !reduceMotion;

  const next = () => setActive((i) => (i + 1) % media.length);

  // Timer for the current slide. Photos wait PHOTO_MS; videos wait for onEnded, with a long safety cap.
  useEffect(() => {
    if (!auto || !current) return;
    const t = window.setTimeout(next, current.kind === "VIDEO" ? VIDEO_CAP_MS : PHOTO_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, active, current]);

  if (media.length === 0 || !current) {
    return <div className="flex aspect-square items-center justify-center rounded-lg border border-line bg-sunken text-subtle">Photo coming soon</div>;
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse">
      <div className="w-full">
        <div
          className="relative aspect-square w-full overflow-hidden rounded-lg border border-line bg-surface"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          {current.kind === "VIDEO" ? (
            // key: switching clips must remount, or the browser keeps playing the old one.
            <video
              key={current.url}
              className="size-full bg-chassis object-contain"
              controls
              muted
              playsInline
              autoPlay={!reduceMotion}
              loop={!many}
              preload="metadata"
              poster={videoPoster(current.url)}
              aria-label={current.alt || `${name} video`}
              onEnded={() => auto && next()}
            >
              <source src={videoSrc(current.url)} />
              Your browser cannot play this video.
            </video>
          ) : (
            <Image
              key={current.url}
              src={current.url}
              alt={current.alt}
              fill
              priority={active === 0}
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="animate-fade-in object-contain p-4"
            />
          )}
        </div>
        {auto && (
          // A thin bar that fills over the photo's time, so it is clear the picture will change.
          <div className="mt-2 h-0.5 overflow-hidden rounded-full bg-line" aria-hidden>
            {current.kind === "IMAGE" && <div key={active} className="h-full origin-left animate-gallery-progress bg-navy-600" />}
          </div>
        )}
      </div>

      {many && (
        <ul className="flex gap-2 overflow-x-auto lg:max-h-136 lg:flex-col lg:overflow-y-auto lg:overflow-x-visible" aria-label="Product pictures">
          {media.map((m, i) => (
            <li key={m.url} className="shrink-0">
              <button
                type="button"
                onClick={() => {
                  setManual(true);
                  setActive(i);
                }}
                aria-label={`${m.kind === "VIDEO" ? "Play video" : "Show photo"} ${i + 1}: ${m.alt}`}
                aria-current={i === active}
                className={cn(
                  "relative block size-16 overflow-hidden rounded-md border bg-surface sm:size-18",
                  i === active ? "border-navy-600 ring-2 ring-navy-600/30" : "border-line hover:border-line-strong",
                )}
              >
                <Image src={m.kind === "VIDEO" ? videoPoster(m.url) : m.url} alt="" fill sizes="72px" className="object-contain p-1" />
                {m.kind === "VIDEO" && <span aria-hidden className="absolute inset-0 grid place-items-center bg-chassis/35 text-sm text-white">▶</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
