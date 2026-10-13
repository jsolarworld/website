"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/cn";
import poster from "@/public/hero/poster.jpg";

const LESS_MOTION = "(prefers-reduced-motion: reduce)";

type Connection = { saveData?: boolean; effectiveType?: string };

function onMotionChange(notify: () => void) {
  const query = window.matchMedia(LESS_MOTION);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

/**
 * Connections too slow to carry the video. Not "3g": Chrome gives that label to any connection whose
 * replies take over about a quarter of a second, which covers most phones in Nigeria reaching this
 * site, so the video would hardly ever play.
 */
const SLOW = ["slow-2g", "2g"];

/** A device that asks for less motion or less data, or is on a slow connection, keeps the still picture. */
function wantsStill(): boolean {
  const connection = (navigator as Navigator & { connection?: Connection }).connection;
  return window.matchMedia(LESS_MOTION).matches || connection?.saveData === true || SLOW.includes(connection?.effectiveType ?? "");
}

/**
 * The home page hero's moving background: the owner's video of stock arriving at the shop, silent and
 * repeating, under a navy wash so the heading on top stays readable. It fills its parent, which must
 * be `relative`.
 *
 * The still picture is the video's own first frame and is all the page waits for. The video file is not
 * asked for until the page has finished loading, and it plays only while the hero is on screen. The
 * files in `public/hero/` are made from the owner's video by `scripts/hero-video.sh`.
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  // null on the server and until the browser takes over, so the button only appears once it works.
  const still = useSyncExternalStore(onMotionChange, wantsStill, () => null);
  /** What the visitor chose with the button, once they have pressed it. */
  const [choice, setChoice] = useState<boolean | null>(null);
  const [shown, setShown] = useState(false);
  const play = choice ?? still === false;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (!play) {
      video.pause();
      return;
    }

    let pageLoaded = document.readyState === "complete";
    let onScreen = false;
    const sync = () => {
      if (!pageLoaded || !onScreen) {
        video.pause();
        return;
      }
      // React does not write the muted attribute, and browsers only start a video by themselves when it is muted.
      video.muted = true;
      video.play().catch((error: unknown) => {
        // The browser would not start it without a tap (an iPhone in Low Power Mode, for one): keep the
        // still picture and show the play button instead.
        if (error instanceof DOMException && error.name === "NotAllowedError") setChoice(false);
      });
    };
    const onLoad = () => {
      pageLoaded = true;
      sync();
    };
    if (!pageLoaded) window.addEventListener("load", onLoad, { once: true });
    const watcher = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      sync();
    });
    watcher.observe(video);
    return () => {
      window.removeEventListener("load", onLoad);
      watcher.disconnect();
    };
  }, [play]);

  function toggle() {
    const video = ref.current;
    if (!video) return;
    if (play) {
      video.pause();
    } else {
      // Started here, inside the tap itself, so a browser that refused to autoplay allows it.
      video.muted = true;
      video.play().catch(() => {});
    }
    setChoice(!play);
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      {/* Imported, not linked by address: its address then changes with its contents, so a replaced
          picture is never served stale from the image cache. The blur fills in until it arrives. */}
      <Image src={poster} alt="" fill preload placeholder="blur" sizes="100vw" className="object-cover" />
      <video
        ref={ref}
        muted
        loop
        playsInline
        preload="none"
        disablePictureInPicture
        disableRemotePlayback
        aria-hidden
        tabIndex={-1}
        onPlaying={() => setShown(true)}
        className={cn("absolute inset-0 size-full object-cover transition-opacity duration-200 ease-out", shown ? "opacity-100" : "opacity-0")}
      >
        <source src="/hero/hero.webm" type="video/webm" />
        <source src="/hero/hero.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-chassis/75" />
      {still !== null && (
        <button
          type="button"
          onClick={toggle}
          aria-label={play ? "Pause background video" : "Play background video"}
          // Top corner, not the bottom one: the floating WhatsApp button covers the bottom right on a phone.
          className="pointer-events-auto absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-full border border-line-on-chassis bg-chassis/60 text-on-chassis transition-colors duration-200 ease-out hover:bg-chassis hover:text-white"
        >
          <svg viewBox="0 0 16 16" className="size-4 fill-current" aria-hidden>
            {play ? (
              <>
                <rect x={3.5} y={3} width={3} height={10} rx={0.75} />
                <rect x={9.5} y={3} width={3} height={10} rx={0.75} />
              </>
            ) : (
              <path d="M5 3.3v9.4a.6.6 0 0 0 .92.5l7.3-4.7a.6.6 0 0 0 0-1L5.92 2.8A.6.6 0 0 0 5 3.3z" />
            )}
          </svg>
        </button>
      )}
    </div>
  );
}
