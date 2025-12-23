import React, { useState, useEffect } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ResultCard } from './components/ResultCard';
import { checkApiKey, requestApiKey, generateComposite, generateLiveVideo } from './services/geminiService';
import { UploadedImage, AppStatus } from './types';

export default function App() {
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [clothesImg, setClothesImg] = useState<UploadedImage | null>(null);
  const [personImg, setPersonImg] = useState<UploadedImage | null>(null);
  const [scenePrompt, setScenePrompt] = useState<string>('');
  
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const verifyKey = async () => {
      const selected = await checkApiKey();
      setHasKey(selected);
    };
    verifyKey();
  }, []);

  const handleConnect = async () => {
    try {
      await requestApiKey();
      // Assume success after dialog interaction, or we could poll checkApiKey
      setHasKey(true);
    } catch (e) {
      console.error(e);
      setErrorMsg("Failed to connect to AI Studio.");
    }
  };

  const handleGenerate = async () => {
    if (!clothesImg || !personImg || !scenePrompt.trim()) return;

    setStatus(AppStatus.GENERATING);
    setErrorMsg(null);
    setResultUrl(null);
    setVideoUrl(null);

    try {
      const url = await generateComposite(clothesImg, personImg, scenePrompt);
      setResultUrl(url);
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      console.error(err);
      if (err.message === "API_KEY_INVALID") {
         setHasKey(false);
         setErrorMsg("API Session expired or invalid. Please reconnect.");
      } else {
         setErrorMsg("Something went wrong during generation. Please try again.");
      }
      setStatus(AppStatus.ERROR);
    }
  };

  const handleAnimate = async () => {
    if (!resultUrl || !scenePrompt) return;

    setIsAnimating(true);
    setErrorMsg(null);

    try {
        const video = await generateLiveVideo(resultUrl, scenePrompt);
        setVideoUrl(video);
    } catch (err: any) {
        console.error(err);
        if (err.message === "API_KEY_INVALID") {
            setHasKey(false);
            setErrorMsg("API Session expired during video generation. Please reconnect.");
         } else {
            setErrorMsg("Failed to generate video. Please try again.");
         }
    } finally {
        setIsAnimating(false);
    }
  };

  if (!hasKey) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-4">
        <div className="max-w-md w-full bg-slate-800 p-8 rounded-2xl shadow-xl text-center border border-slate-700">
          <h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Festive Style Mixer
          </h1>
          <p className="text-slate-400 mb-8">
            Experience the power of Gemini 3 Pro Image & Veo. Please verify your API key to access high-quality image composition and video generation.
          </p>
          <div className="space-y-4">
            <button
              onClick={handleConnect}
              className="w-full py-3 px-6 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-emerald-900/50"
            >
              Connect with Google AI Studio
            </button>
            <p className="text-xs text-slate-500">
              Note: This application requires a paid GCP project via Google AI Studio. 
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-emerald-400 underline ml-1">
                Learn more about billing.
              </a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center font-bold text-white">
              G
            </div>
            <span className="font-bold text-lg tracking-tight">Festive Style Mixer</span>
            <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded border border-slate-700 ml-2">Gemini 3 Pro + Veo</span>
          </div>
          <button 
            onClick={() => setHasKey(false)}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Change API Key
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          
          {/* Left Column: Inputs */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-sm">1</span>
                Upload Assets
              </h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <ImageUploader 
                  label="Outfit (Xmas)" 
                  image={clothesImg} 
                  onImageUpload={setClothesImg}
                  onRemove={() => setClothesImg(null)}
                />
                <ImageUploader 
                  label="Person" 
                  image={personImg} 
                  onImageUpload={setPersonImg}
                  onRemove={() => setPersonImg(null)}
                />
              </div>

              <div className="space-y-3">
                 <h2 className="text-xl font-bold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-sm">2</span>
                  Set the Scene
                </h2>
                <textarea
                  value={scenePrompt}
                  onChange={(e) => setScenePrompt(e.target.value)}
                  placeholder="E.g., A cozy living room with a fireplace, snow falling outside the window, warm lighting..."
                  className="w-full h-32 bg-slate-950 border border-slate-700 rounded-xl p-4 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none transition-all placeholder:text-slate-600"
                />
              </div>

              <div className="mt-8">
                <button
                  onClick={handleGenerate}
                  disabled={!clothesImg || !personImg || !scenePrompt || status === AppStatus.GENERATING || isAnimating}
                  className={`
                    w-full py-4 px-6 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all transform active:scale-95
                    ${(!clothesImg || !personImg || !scenePrompt || status === AppStatus.GENERATING || isAnimating)
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-900/50'
                    }
                  `}
                >
                   {status === AppStatus.GENERATING ? (
                     <span>Processing...</span>
                   ) : (
                     <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M9 4.5a.75.75 0 0 1 .721.544l.813 2.846a3.75 3.75 0 0 0 2.576 2.576l2.846.813a.75.75 0 0 1 0 1.442l-2.846.813a3.75 3.75 0 0 0-2.576 2.576l-.813 2.846a.75.75 0 0 1-1.442 0l-.813-2.846a3.75 3.75 0 0 0-2.576-2.576l-2.846-.813a.75.75 0 0 1 0-1.442l2.846-.813a3.75 3.75 0 0 0 2.576-2.576l.813-2.846A.75.75 0 0 1 9 4.5ZM1.5 13.5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 0 .75.75h4.5a.75.75 0 0 1 0 1.5h-4.5A2.25 2.25 0 0 1 1.5 18.75v-4.5a.75.75 0 0 1 .75-.75ZM22.5 10.5a.75.75 0 0 1 .75.75v4.5a2.25 2.25 0 0 1-2.25 2.25h-4.5a.75.75 0 0 1 0-1.5h4.5a.75.75 0 0 0 .75-.75v-4.5a.75.75 0 0 1 .75-.75Z" clipRule="evenodd" />
                      </svg>
                      Generate Composite
                     </>
                   )}
                </button>
                {errorMsg && (
                  <p className="text-red-400 text-sm mt-3 text-center bg-red-900/20 p-2 rounded-lg border border-red-900/50">
                    {errorMsg}
                  </p>
                )}
              </div>
            </div>
            
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50 text-xs text-slate-500">
               <p className="mb-1 font-semibold text-slate-400">Tips for best results:</p>
               <ul className="list-disc pl-4 space-y-1">
                 <li>Use full-body photos for the person.</li>
                 <li>Ensure the clothes image is clear and flat or on a mannequin.</li>
                 <li>Be specific about lighting in your scene description.</li>
                 <li>Video generation may take 10-30 seconds.</li>
               </ul>
            </div>
          </div>

          {/* Right Column: Result */}
          <div className="lg:col-span-8 h-full min-h-[500px]">
            <ResultCard 
              status={status} 
              resultImageUrl={resultUrl} 
              resultVideoUrl={videoUrl}
              onAnimate={handleAnimate}
              isAnimating={isAnimating}
              loadingMessage="Stitching outfit & scene..."
            />
          </div>

        </div>
      </main>
    </div>
  );
}
