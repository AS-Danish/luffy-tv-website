"use client";

import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { artworkSources, artworkUrl } from "@/lib/artwork";

type ArtworkImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  fallbacks?: Array<string | null | undefined>;
};

export function ArtworkImage({ src, fallbacks = [], alt = "", onError, ...props }: ArtworkImageProps) {
  const signature = [src, ...fallbacks].join("\u0000");
  const candidates = artworkSources(src, ...fallbacks);
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => setCandidateIndex(0), [signature]);

  return <img
    {...props}
    src={artworkUrl(candidates[Math.min(candidateIndex, candidates.length - 1)])}
    alt={alt}
    onError={(event) => {
      onError?.(event);
      setCandidateIndex((index) => Math.min(index + 1, candidates.length - 1));
    }}
  />;
}
