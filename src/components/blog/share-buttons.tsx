"use client";

import { useEffect, useState } from "react";

export function ShareButtons({ title }: { title: string }) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial client-side sync after mount
    setUrl(window.location.href);
  }, []);

  if (!url) return null;
  return <ShareLinks title={title} url={url} />;
}

export function ShareLinks({ title, url }: { title: string; url: string }) {
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[11px] uppercase tracking-widest text-[#666666]">
        Share
      </span>
      <a
        href={twitterUrl}
        target="_blank"
        aria-label="Share on X (opens in a new tab)"
        rel="noopener noreferrer"
        className="font-mono text-[13px] text-[#666666] hover:text-white transition-colors border border-[#2A2A2A] px-3 py-1.5"
      >
        X
      </a>
      <a
        href={linkedinUrl}
        target="_blank"
        aria-label="Share on LinkedIn (opens in a new tab)"
        rel="noopener noreferrer"
        className="font-mono text-[13px] text-[#666666] hover:text-white transition-colors border border-[#2A2A2A] px-3 py-1.5"
      >
        LinkedIn
      </a>
    </div>
  );
}
