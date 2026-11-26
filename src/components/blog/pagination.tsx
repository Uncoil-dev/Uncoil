import Link from "next/link";

export function Pagination({
  hasOlder,
  hasNewer,
  categories,
}: {
  hasOlder: boolean;
  hasNewer: boolean;
  categories?: string[];
}) {
  function buildUrl(direction: "older" | "newer") {
    const params = new URLSearchParams();
    for (const category of categories ?? []) params.append("category", category);
    if (direction === "older") params.set("before", "1");
    else params.set("after", "1");
    return `/blog${params.toString() ? `?${params.toString()}` : ""}`;
  }

  return (
    <div className="flex items-center justify-between pt-8 border-t border-[#2A2A2A]">
      <div>
        {hasOlder && (
          <Link
            href={buildUrl("older")}
            className="font-mono text-[13px] text-[#666666] hover:text-white transition-colors"
          >
            <span aria-hidden="true">←</span> Older posts
          </Link>
        )}
      </div>
      <div>
        {hasNewer && (
          <Link
            href={buildUrl("newer")}
            className="font-mono text-[13px] text-[#666666] hover:text-white transition-colors"
          >
            Newer posts <span aria-hidden="true">→</span>
          </Link>
        )}
      </div>
    </div>
  );
}
