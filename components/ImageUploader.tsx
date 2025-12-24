import React, { useRef } from 'react';
import { UploadedImage } from '../types';

interface ImageUploaderProps {
  label: string;
  image: UploadedImage | null;
  onImageUpload: (img: UploadedImage) => void;
  onRemove: () => void;
  onPreview?: (url: string) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  label,
  image,
  onImageUpload,
  onRemove,
  onPreview,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Extract base64 data (remove "data:image/jpeg;base64," prefix)
      const base64Data = result.split(',')[1];
      const mimeType = file.type;

      onImageUpload({
        id: crypto.randomUUID(),
        data: base64Data,
        mimeType: mimeType,
        previewUrl: result,
      });
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
        {label}
      </label>
      
      <div 
        className={`
          relative w-full aspect-[3/4] rounded-xl border-2 border-dashed transition-all duration-200 overflow-hidden group
          ${image 
            ? 'border-emerald-500/50 bg-slate-800' 
            : 'border-slate-600 hover:border-emerald-400 hover:bg-slate-800/50 cursor-pointer bg-slate-900'
          }
        `}
        onClick={!image ? triggerUpload : undefined}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />

        {image ? (
          <div 
            className="relative w-full h-full cursor-zoom-in"
            onClick={() => onPreview && onPreview(image.previewUrl)}
          >
            <img 
              src={image.previewUrl} 
              alt={label} 
              className="w-full h-full object-cover"
            />
            {/* Hover overlay with actions */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
               {/* View Button (Visual Hint) */}
               <div className="pointer-events-none text-white opacity-80 mb-8">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                  </svg>
               </div>

              <div className="absolute bottom-4 w-full flex justify-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent opening modal
                      onRemove();
                    }}
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg transform transition-transform hover:scale-105"
                  >
                    Remove
                  </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-sm">Click to upload</span>
          </div>
        )}
      </div>
    </div>
  );
};