import { Notice } from "@/components/ui";

/**
 * Says which heavy appliances the quote is not sized for, so nobody expects the cooker to run on solar.
 * Used by the quote wizard and the saved quote page; `canChange` adds how to put one back.
 */
export function LeftOffNotice({ names, canChange = false, className }: { names?: string[]; canChange?: boolean; className?: string }) {
  if (!names || names.length === 0) return null;
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0];

  return (
    <Notice title="Not powered by this system" className={className}>
      {list} will stay on NEPA or generator. Everything on this page is sized without {names.length > 1 ? "them" : "it"}.
      {canChange && " To include one, change your answers and tick it."}
    </Notice>
  );
}
