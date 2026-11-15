import { useEffect, useState } from 'react';
import { Package } from 'lucide-react';
import { resolveImageUrl } from '../lib/imageUtils.ts';

interface SafeImageProps {
  src?: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function SafeImage({
  src,
  fallbackSrc,
  alt,
  className = '',
  fallbackTitle,
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  const resolvedPrimary = resolveImageUrl(src);
  const resolvedFallback = resolveImageUrl(fallbackSrc);

  useEffect(() => {
    setFailed(false);
    setUseFallback(false);
  }, [resolvedPrimary, resolvedFallback]);

  const activeSrc = useFallback
    ? resolvedFallback
    : resolvedPrimary || resolvedFallback;

  if (!activeSrc || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 text-emerald-800/70 p-4 text-center ${className}`}
      >
        <Package className="w-8 h-8 mb-2 stroke-[1.5]" />
        <span className="text-xs font-medium line-clamp-2 max-w-[180px]">
          {fallbackTitle || alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={activeSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => {
        if (!useFallback && resolvedFallback && activeSrc !== resolvedFallback) {
          setUseFallback(true);
        } else {
          setFailed(true);
        }
      }}
      className={className}
    />
  );
}
