import Link from "next/link";

export const metadata = { title: "Link turned off", robots: { index: false, follow: false } };

export default function SharedRunGone() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#eceae3] px-5 text-[#090909]">
      <div className="w-full max-w-md border border-black/15 bg-white p-8">
        <p className="font-pixel text-xl tracking-[-0.06em]">uncoil</p>
        <h1 className="mt-6 font-pixel text-3xl leading-tight">This link is turned off</h1>
        <p className="mt-3 text-sm leading-relaxed text-black/65">The owner stopped sharing this run, or the link is wrong. Ask them for a new link.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href={process.env.NEXT_PUBLIC_MARKETING_ORIGIN || "https://www.uncoil.dev"} className="flex h-9 items-center border border-black bg-[#f4d44d] px-4 font-mono text-[11px] uppercase hover:bg-[#f7dc6b]">What is Uncoil?</Link>
        </div>
      </div>
    </main>
  );
}
