import React from 'react';
import { AppStatus } from '../types';

interface ResultCardProps {
  status: AppStatus;
  resultImageUrl: string | null;
  loadingMessage?: string;
}

export const ResultCard: React.FC<ResultCardProps> = ({ status, resultImageUrl, loadingMessage }) => {
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

  return (
    <div className="h-full min-h-[400px] bg-slate-900 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-900/20 flex items-center justify-center p-4">
      {resultImageUrl ? (
        <img 
          src={resultImageUrl} 
          alt="Generated Result" 
          className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-lg"
        />
      ) : (
        <div className="text-red-400">Failed to generate image.</div>
      )}
    </div>
  );
};
