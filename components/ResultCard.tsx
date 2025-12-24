import React, { useState, useEffect } from 'react';
import { AppStatus } from '../types';

interface ResultCardProps {
  status: AppStatus;
  resultImageUrl: string | null;
  resultVideoUrl: string | null;
  loadingMessage?: string;
  onAnimate: () => void;
  isAnimating: boolean;
  onPreview?: (url: string) => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ 
  status, 
  resultImageUrl, 
  resultVideoUrl, 
  loadingMessage,
  onAnimate,
  isAnimating,
  onPreview
}) => {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>('image');

  // Auto-switch to video tab when video is ready
  useEffect(() => {
    if (resultVideoUrl) {
      setActiveTab('video');
    }
  }, [resultVideoUrl]);

  if (status === AppStatus.IDLE) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-900/50">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4 opacity-50">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
        </svg>
        <p className="text-lg font-medium">Ready to create magic</p>
        <p className="text-sm text-slate-600 mt-2">Upload images and describe a scene</p>
      </div>
    );
  }

  if (status === AppStatus.GENERATING) {
    return (
      <div className="h-full min-h-[400px] flex flex-col items-center justify-center bg-slate-900 rounded-2xl relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 animate-pulse"></div>
        
        <div className="relative z-10 flex flex-col items-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-emerald-400 font-medium animate-pulse text-lg">{loadingMessage || 'Synthesizing...'}</p>
            <p className="text-slate-500 text-sm mt-2 max-w-xs text-center">Gemini is weaving the outfit, person, and scene together.</p>
        </div>
      </div>
    );
  }

  const showVideo = activeTab === 'video' && resultVideoUrl;

  return (
    <div className="h-full min-h-[400px] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-900/20 flex flex-col p-4 relative">
      
      {/* Tabs / Header if multiple assets exist */}
      {resultImageUrl && resultVideoUrl && (
        <div className="flex items-center justify-center mb-4 bg-slate-800 p-1 rounded-lg w-fit mx-auto">
          <button
            onClick={() => setActiveTab('image')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'image' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Original Photo
          </button>
          <button
            onClick={() => setActiveTab('video')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'video' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Live Photo
          </button>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center relative min-h-0">
        {resultImageUrl ? (
          <>
            {showVideo ? (
              <div className="relative w-full h-full flex items-center justify-center">
                 <video 
                    src={resultVideoUrl!} 
                    controls 
                    autoPlay 
                    loop 
                    className="max-w-full max-h-[70vh] rounded-lg shadow-lg border border-slate-800"
                 />
                 <div className="absolute top-4 right-4 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/20">
                    3s Live
                 </div>
              </div>
            ) : (
              <div className="relative group w-full h-full flex flex-col items-center justify-center">
                <div 
                  className="relative cursor-zoom-in max-w-full max-h-[70vh]"
                  onClick={() => onPreview && onPreview(resultImageUrl)}
                >
                  <img 
                    src={resultImageUrl} 
                    alt="Generated Result" 
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                  />
                  {/* Hover hint */}
                   <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full backdrop-blur-sm flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                        Click to zoom
                      </div>
                   </div>
                </div>
                
                {/* Only show Animate button if we are in image mode AND (video doesn't exist OR we want to allow regen) */}
                {!resultVideoUrl && (
                  <div className="mt-6">
                     <button
                       onClick={onAnimate}
                       disabled={isAnimating}
                       className={`
                         flex items-center gap-2 px-6 py-3 rounded-full font-bold shadow-lg transition-all transform hover:scale-105 active:scale-95
                         ${isAnimating 
                            ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-purple-900/40 border border-white/10'
                         }
                       `}
                     >
                        {isAnimating ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Creating Live Photo...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                              <path d="M4.5 4.5a3 3 0 0 0-3 3v9a3 3 0 0 0 3 3h8.25a3 3 0 0 0 3-3v-9a3 3 0 0 0-3-3H4.5ZM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06Z" />
                            </svg>
                            Make it Live (3s)
                          </>
                        )}
                     </button>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-red-400">Failed to display content.</div>
        )}
      </div>
    </div>
  );
};