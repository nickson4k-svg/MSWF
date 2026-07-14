'use client';

import { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

interface LinkPreviewData {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  url: string;
}

export function LinkPreview({ url }: { url: string }) {
  const [data, setData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/unfurl?url=${encodeURIComponent(url)}`)
      .then(res => res.json())
      .then(d => { if (mounted && d.title) setData(d); })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [url]);

  if (loading || !data || !data.title) return null;

  return (
    <a 
      href={data.url} 
      target="_blank" 
      rel="noopener noreferrer"
      className="block mt-2 rounded-xl overflow-hidden border border-zinc-800/80 bg-zinc-900/80 hover:bg-zinc-800/80 transition-colors max-w-sm group"
    >
      {data.image && (
        <div className="relative w-full h-36 overflow-hidden bg-zinc-800">
          <img src={data.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        </div>
      )}
      <div className="p-3 space-y-1">
        {data.siteName && (
          <p className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            {data.siteName}
          </p>
        )}
        <p className="text-sm font-semibold text-zinc-100 leading-tight line-clamp-2">{data.title}</p>
        {data.description && (
          <p className="text-xs text-zinc-400 line-clamp-2">{data.description}</p>
        )}
      </div>
    </a>
  );
}
