import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Written out in full: Tailwind only generates classes it can read in the source.
const body = "fill-navy-600";
const deep = "fill-navy-800";
const dark = "fill-navy-900";
const soft = "fill-navy-400";
const mid = "fill-navy-300";
const pale = "fill-navy-100";
const gold = "fill-solar-400";
const goldLine = "fill-none stroke-solar-400";
const midLine = "fill-none stroke-navy-300";
const paleLine = "fill-none stroke-navy-100";

/** One drawing per category slug, on an 80 by 80 canvas. A category with no drawing gets the solar panel. */
const ART: Record<string, ReactNode> = {
  // A wall inverter: screen with a sine wave, status lights, cooling vents.
  inverters: (
    <>
      <rect x={18} y={10} width={44} height={60} rx={6} className={body} />
      <rect x={25} y={18} width={30} height={18} rx={3} className={dark} />
      <path d="M29.5 27q3.5-8 7 0t7 0 7 0" strokeWidth={2.5} strokeLinecap="round" className={goldLine} />
      <circle cx={28} cy={45} r={2.5} className={gold} />
      <circle cx={36} cy={45} r={2.5} className={mid} />
      <rect x={26} y={53} width={28} height={3} rx={1.5} className={mid} />
      <rect x={26} y={60} width={28} height={3} rx={1.5} className={mid} />
    </>
  ),

  // The inverter sitting on its own battery cabinet.
  "inverter-and-battery-sets": (
    <>
      <rect x={20} y={8} width={40} height={26} rx={5} className={body} />
      <rect x={26} y={14} width={28} height={12} rx={2.5} className={dark} />
      <path d="M31 20q3-6 6 0t6 0 6 0" strokeWidth={2.2} strokeLinecap="round" className={goldLine} />
      <rect x={14} y={38} width={52} height={34} rx={5} className={deep} />
      <rect x={22} y={46} width={9} height={18} rx={2} className={gold} />
      <rect x={35.5} y={46} width={9} height={18} rx={2} className={gold} />
      <rect x={49} y={46} width={9} height={18} rx={2} className={soft} />
    </>
  ),

  // An upright lithium pack with its charge lights.
  "lithium-batteries": (
    <>
      <rect x={20} y={8} width={40} height={64} rx={7} className={body} />
      <rect x={28} y={17} width={24} height={8} rx={2.5} className={soft} />
      <rect x={28} y={29} width={24} height={8} rx={2.5} className={gold} />
      <rect x={28} y={41} width={24} height={8} rx={2.5} className={gold} />
      <rect x={28} y={53} width={24} height={8} rx={2.5} className={gold} />
    </>
  ),

  // A tall wet-cell battery: two posts, a row of vent caps, ribbed case.
  "tubular-batteries": (
    <>
      <rect x={17} y={13} width={8} height={9} rx={1.5} className={gold} />
      <rect x={55} y={13} width={8} height={9} rx={1.5} className={gold} />
      <rect x={29} y={16} width={5} height={6} rx={1} className={mid} />
      <rect x={37.5} y={16} width={5} height={6} rx={1} className={mid} />
      <rect x={46} y={16} width={5} height={6} rx={1} className={mid} />
      <rect x={14} y={26} width={52} height={46} rx={4} className={body} />
      <rect x={12} y={22} width={56} height={9} rx={2.5} className={deep} />
      <rect x={22} y={38} width={4} height={27} rx={2} className={soft} />
      <rect x={33} y={38} width={4} height={27} rx={2} className={soft} />
      <rect x={43} y={38} width={4} height={27} rx={2} className={soft} />
      <rect x={54} y={38} width={4} height={27} rx={2} className={soft} />
    </>
  ),

  // A sealed battery: low, wide, no caps, plus and minus on the label.
  "drycell-batteries": (
    <>
      <rect x={16} y={20} width={11} height={9} rx={2} className={gold} />
      <rect x={53} y={20} width={11} height={9} rx={2} className={gold} />
      <rect x={8} y={27} width={64} height={42} rx={5} className={body} />
      <rect x={8} y={40} width={64} height={16} className={deep} />
      <rect x={17} y={46.5} width={9} height={3} rx={1} className={pale} />
      <rect x={20} y={43.5} width={3} height={9} rx={1} className={pale} />
      <rect x={54} y={46.5} width={9} height={3} rx={1} className={pale} />
    </>
  ),

  // The tank on top of its row of heating tubes, under the sun.
  "solar-water-heaters": (
    <>
      <circle cx={63} cy={13} r={7} className={gold} />
      <rect x={14} y={42} width={6} height={30} rx={3} className={soft} />
      <rect x={24} y={42} width={6} height={30} rx={3} className={soft} />
      <rect x={34} y={42} width={6} height={30} rx={3} className={soft} />
      <rect x={44} y={42} width={6} height={30} rx={3} className={soft} />
      <rect x={54} y={42} width={6} height={30} rx={3} className={soft} />
      <rect x={8} y={25} width={58} height={18} rx={9} className={body} />
    </>
  ),

  // The indoor unit of a split air conditioner, blowing down.
  "inverter-air-conditioners": (
    <>
      <rect x={8} y={14} width={64} height={26} rx={7} className={body} />
      <rect x={15} y={30} width={50} height={4} rx={2} className={dark} />
      <circle cx={62} cy={22} r={2.5} className={gold} />
      <path d="M26 48c-4 5 4 9 0 14" strokeWidth={3.5} strokeLinecap="round" className={midLine} />
      <path d="M40 48c-5 6 5 12 0 18" strokeWidth={3.5} strokeLinecap="round" className={midLine} />
      <path d="M54 48c-4 5 4 9 0 14" strokeWidth={3.5} strokeLinecap="round" className={midLine} />
    </>
  ),

  // A chest freezer with a snowflake on the front.
  "solar-freezers": (
    <>
      <rect x={14} y={66} width={8} height={6} rx={1} className={deep} />
      <rect x={58} y={66} width={8} height={6} rx={1} className={deep} />
      <rect x={10} y={22} width={60} height={46} rx={4} className={body} />
      <rect x={8} y={14} width={64} height={13} rx={4} className={deep} />
      <rect x={33} y={30} width={14} height={3} rx={1.5} className={gold} />
      <g strokeWidth={3} strokeLinecap="round" className={paleLine}>
        <path d="M40 40v22" />
        <path d="M30.5 45.5l19 11" />
        <path d="M30.5 56.5l19-11" />
      </g>
    </>
  ),

  // A panel of cells catching the sun from the corner, as on the product placeholder.
  "solar-panels": (
    <>
      <circle cx={62} cy={16} r={13} strokeWidth={2} className="fill-none stroke-solar-300" />
      <circle cx={62} cy={16} r={8.5} className={gold} />
      <rect x={8} y={32} width={52} height={40} rx={3} className={deep} />
      <rect x={11} y={35} width={14} height={10} rx={1} className={body} />
      <rect x={27} y={35} width={14} height={10} rx={1} className="fill-navy-500" />
      <rect x={43} y={35} width={14} height={10} rx={1} className={soft} />
      <rect x={11} y={47} width={14} height={10} rx={1} className={body} />
      <rect x={27} y={47} width={14} height={10} rx={1} className={body} />
      <rect x={43} y={47} width={14} height={10} rx={1} className="fill-navy-500" />
      <rect x={11} y={59} width={14} height={10} rx={1} className={body} />
      <rect x={27} y={59} width={14} height={10} rx={1} className={body} />
      <rect x={43} y={59} width={14} height={10} rx={1} className={body} />
    </>
  ),

  // A pole with its panel on top and the lamp lighting the ground.
  "solar-street-lights": (
    <>
      <polygon points="44,30 64,30 74,64 40,64" className="fill-solar-200" />
      <rect x={34} y={14} width={4} height={56} className={body} />
      <rect x={27} y={68} width={18} height={4} rx={1} className={deep} />
      <polygon points="22,13 58,6 59,11 23,18" className={deep} />
      <rect x={36} y={22} width={30} height={7} rx={3.5} className={body} />
      <rect x={46} y={27.5} width={16} height={2.5} rx={1.25} className={gold} />
    </>
  ),

  // A controller: display showing sun and battery, with the wiring terminals along the bottom.
  "charge-controllers": (
    <>
      <rect x={10} y={14} width={60} height={52} rx={6} className={body} />
      <rect x={18} y={21} width={44} height={18} rx={3} className={dark} />
      <circle cx={27} cy={30} r={4} className={gold} />
      <rect x={38} y={26} width={4} height={8} rx={1} className={gold} />
      <rect x={45} y={26} width={4} height={8} rx={1} className={gold} />
      <rect x={52} y={26} width={4} height={8} rx={1} className={soft} />
      <circle cx={22} cy={46} r={2.5} className={mid} />
      <circle cx={30} cy={46} r={2.5} className={mid} />
      <rect x={18} y={54} width={5} height={6} rx={1} className={dark} />
      <rect x={26} y={54} width={5} height={6} rx={1} className={dark} />
      <rect x={34} y={54} width={5} height={6} rx={1} className={dark} />
      <rect x={42} y={54} width={5} height={6} rx={1} className={dark} />
      <rect x={50} y={54} width={5} height={6} rx={1} className={dark} />
      <rect x={58} y={54} width={5} height={6} rx={1} className={dark} />
    </>
  ),

  // A pump housing with its outlet pipe, and the water it moves.
  "solar-pumps": (
    <>
      <rect x={40} y={12} width={12} height={26} className={body} />
      <rect x={37} y={8} width={18} height={6} rx={2} className={deep} />
      <rect x={16} y={66} width={36} height={6} rx={1.5} className={deep} />
      <circle cx={34} cy={46} r={22} className={body} />
      <circle cx={34} cy={46} r={11} className={dark} />
      <circle cx={34} cy={46} r={4} className={gold} />
      <path d="M66 38c-4 6-7 9.5-7 13a7 7 0 0 0 14 0c0-3.5-3-7-7-13z" className={mid} />
    </>
  ),

  // A stabilizer: the voltage meter holding steady, a power light and the readout.
  stabilizers: (
    <>
      <rect x={12} y={12} width={56} height={56} rx={6} className={body} />
      <path d="M22 44a18 18 0 0 1 36 0z" className={pale} />
      <path d="M40 44L50 31" strokeWidth={3} strokeLinecap="round" className="fill-none stroke-navy-900" />
      <circle cx={40} cy={44} r={3.5} className={dark} />
      <circle cx={25} cy={56} r={3} className={gold} />
      <rect x={34} y={51} width={24} height={10} rx={2} className={dark} />
      <rect x={38} y={55} width={16} height={2} rx={1} className={gold} />
    </>
  ),

  // A complete system: a house with panels on the roof, under the sun.
  "solar-packages": (
    <>
      <circle cx={66} cy={13} r={7} className={gold} />
      <rect x={14} y={44} width={48} height={28} className={mid} />
      <rect x={33} y={54} width={10} height={18} rx={1} className={body} />
      <polygon points="6,46 20,22 56,22 70,46" className={body} />
      <polygon points="20.5,27 30.8,27 28.2,41 12.5,41" className={dark} />
      <polygon points="32.8,27 43.2,27 45.8,41 30.2,41" className={dark} />
      <polygon points="45.2,27 55.5,27 63.5,41 47.8,41" className={dark} />
    </>
  ),

  // Protection: a shield carrying a surge.
  accessories: (
    <>
      <path d="M40 8l26 9v20c0 17-11 28-26 35C25 65 14 54 14 37V17z" className={body} />
      <polygon points="44,22 30,44 39,44 36,58 50,36 41,36" className={gold} />
    </>
  ),

  // A coil of cable ending in a connector.
  "cables-and-components": (
    <>
      <path d="M36 60h26" strokeWidth={7} className="fill-none stroke-navy-600" />
      <circle cx={36} cy={38} r={22} strokeWidth={7} className="fill-none stroke-navy-600" />
      <circle cx={36} cy={38} r={12} strokeWidth={5} className={midLine} />
      <rect x={72} y={56.5} width={4} height={2.5} className={deep} />
      <rect x={72} y={61} width={4} height={2.5} className={deep} />
      <rect x={60} y={54} width={12} height={12} rx={2} className={gold} />
    </>
  ),
};

/** The category slugs that have their own drawing, for the style guide. */
export const CATEGORY_ART_SLUGS = Object.keys(ART);

/**
 * A small drawing of what a category sells, in the brand colours, for category tiles. Like `ProductPlaceholder`
 * it paints its own pale backdrop and fills the width of its parent, so the parent sets the height.
 */
export function CategoryArt({ slug, className }: { slug: string; className?: string }) {
  return (
    <div className={cn("flex items-center justify-center bg-navy-50", className)}>
      <svg viewBox="0 0 80 80" className="aspect-square h-4/5" aria-hidden>
        {ART[slug] ?? ART["solar-panels"]}
      </svg>
    </div>
  );
}
