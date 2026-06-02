import React, { useState, useEffect } from 'react';

interface QuestionMediaProps {
  key?: string;
  mediaType?: 'image' | 'video' | string | null;
  mediaUrl?: string | null;
  caption?: string | null;
}

export default function QuestionMedia({ mediaType, mediaUrl, caption }: QuestionMediaProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [mediaUrl, mediaType]);

  if (!mediaType || !mediaUrl || mediaUrl.trim() === '') {
    return null;
  }

  const type = mediaType.toLowerCase().trim();

  // Helper to extract YouTube embed URL and ID securely
  const getYouTubeEmbedUrl = (url: string): string | null => {
    try {
      let videoId: string | null = null;
      
      if (url.includes('youtube.com/embed/') || url.includes('youtube-nocookie.com/embed/')) {
        const parts = url.split('/embed/');
        if (parts[1]) {
          videoId = parts[1].split(/[?#]/)[0];
        }
      } else if (url.includes('youtu.be/')) {
        const parts = url.split('youtu.be/');
        if (parts[1]) {
          videoId = parts[1].split(/[?#]/)[0];
        }
      } else if (url.includes('youtube.com/watch')) {
        const queryPart = url.split('?')[1] || '';
        const params = new URLSearchParams(queryPart);
        videoId = params.get('v');
        if (!videoId && url.includes('v=')) {
          videoId = url.split('v=')[1]?.split('&')[0];
        }
      } else if (url.includes('youtube-nocookie.com/watch')) {
        const queryPart = url.split('?')[1] || '';
        const params = new URLSearchParams(queryPart);
        videoId = params.get('v');
        if (!videoId && url.includes('v=')) {
          videoId = url.split('v=')[1]?.split('&')[0];
        }
      }

      if (videoId) {
        const useNocookie = url.includes('youtube-nocookie.com');
        const domain = useNocookie ? 'youtube-nocookie.com' : 'youtube.com';
        return `https://www.${domain}/embed/${videoId}`;
      }
    } catch (e) {
      console.error('Error parsing YouTube URL:', e);
    }
    return null;
  };

  const youtubeEmbedUrl = getYouTubeEmbedUrl(mediaUrl);
  const isYouTube = youtubeEmbedUrl !== null;

  const handleMediaError = () => {
    setHasError(true);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center my-6 max-w-2xl mx-auto bg-slate-50/50 border border-slate-200 p-3 rounded-2xl shadow-xs" id="question-media-container">
      {hasError ? (
        <div className="w-full h-32 flex items-center justify-center bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500 text-center px-4">
          {type === 'video' ? 'Video tidak dapat dimuatkan.' : 'Media tidak dapat dimuatkan.'}
        </div>
      ) : (
        <div className="w-full relative flex flex-col items-center">
          {type === 'image' && (
            <div className="relative w-full flex flex-col items-center justify-center">
              {!isLoaded && !hasError && (
                <div className="w-full h-40 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-2xl">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
              <img
                key={mediaUrl}
                src={mediaUrl}
                alt={caption || 'Visual Kuiz'}
                className={`w-full max-h-[420px] object-contain rounded-2xl bg-slate-50 border border-slate-100 shadow-xs ${!isLoaded ? 'opacity-0 h-0 absolute pointer-events-none' : 'opacity-100 block transition-opacity duration-200'}`}
                onLoad={() => setIsLoaded(true)}
                onError={handleMediaError}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {type === 'video' && (
            isYouTube ? (
              <div className="w-full flex flex-col items-center gap-3" key={mediaUrl}>
                <div 
                  className="relative w-full overflow-hidden rounded-2xl bg-black border border-slate-100 shadow-xs"
                  style={{ aspectRatio: '16 / 9' }}
                >
                  <iframe
                    src={youtubeEmbedUrl || undefined}
                    title={caption || 'Youtube Video'}
                    className="absolute top-0 left-0 w-full h-full"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
                <a 
                  href={mediaUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline flex items-center gap-1 transition-colors mt-1"
                >
                  Buka video dalam tab baharu
                </a>
              </div>
            ) : (
              <div className="w-full overflow-hidden rounded-2xl border border-slate-100 shadow-xs bg-black flex flex-col items-center gap-3" key={mediaUrl}>
                <video
                  key={mediaUrl}
                  src={mediaUrl}
                  controls
                  preload="metadata"
                  className="w-full max-h-[420px] object-contain"
                  onError={handleMediaError}
                >
                  Your browser does not support the video tag.
                </video>
                <a 
                  href={mediaUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline flex items-center gap-1 transition-colors my-1"
                >
                  Buka video dalam tab baharu
                </a>
              </div>
            )
          )}
        </div>
      )}

      {caption && !hasError && (
        <p className="text-xs text-slate-500 font-medium mt-2.5 text-center leading-relaxed max-w-full px-2 italic">
          {caption}
        </p>
      )}
    </div>
  );
}
