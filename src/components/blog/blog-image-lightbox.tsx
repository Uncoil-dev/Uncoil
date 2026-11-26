"use client";

import { useCallback, useEffect, useState } from "react";

function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "auto";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center border border-white bg-black text-white hover:bg-white hover:text-black"
        aria-label="Close image viewer"
      >
        ✕
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary blog image URLs and sizes */}
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] border border-white object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <p className="absolute bottom-4 left-4 font-mono text-xs text-white/70">Press ESC to close</p>
    </div>
  );
}

export function BlogImage({
  src,
  alt,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = useCallback(() => setIsOpen(true), []);
  const handleClose = useCallback(() => setIsOpen(false), []);

  const canOpen = typeof src === "string" && typeof alt === "string";
  const buttonProps = canOpen
    ? {
        onClick: handleClick,
        role: "button",
        tabIndex: 0,
        "aria-label": alt ? `Enlarge image: ${alt}` : "Enlarge image",
        "aria-haspopup": "dialog" as const,
        onKeyDown: (e: React.KeyboardEvent<HTMLImageElement>) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        },
      }
    : {};

  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary blog image URLs and sizes */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        {...props}
        {...buttonProps}
        className="w-full cursor-pointer border border-black hover:opacity-75"
      />
      {isOpen && canOpen && <ImageLightbox src={src} alt={alt} onClose={handleClose} />}
    </>
  );
}
