import React, { useState, useRef, ChangeEvent } from 'react';
import { UploadCloud, Film, Play, Loader2, RefreshCw, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseScriptToPanels, generatePanelImage, StoryboardPanel } from './services/aiService';
import { cn } from './lib/utils';

export default function App() {
  const [scriptText, setScriptText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panels, setPanels] = useState<StoryboardPanel[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/plain') {
        setError('Please upload a valid .txt file');
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        setScriptText(event.target?.result as string);
        setError(null);
    };
    reader.onerror = () => {
        setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    if (!scriptText.trim()) {
      setError('Please enter a script or upload a file first.');
      return;
    }

    setIsParsing(true);
    setError(null);
    setPanels([]);

    try {
      // 1. Parse Script into panel descriptions
      const initialPanels = await parseScriptToPanels(scriptText);
      setPanels(initialPanels);
      setIsParsing(false);

      // 2. Sequentially generate images for each panel
      for (let i = 0; i < initialPanels.length; i++) {
        setPanels(currentPanels => 
          currentPanels.map((p, index) => index === i ? { ...p, status: 'generating' } : p)
        );

        try {
          const imageUrl = await generatePanelImage(initialPanels[i].imagePrompt);
          setPanels(currentPanels => 
            currentPanels.map((p, index) => 
              index === i ? { ...p, imageUrl: imageUrl || undefined, status: imageUrl ? 'completed' : 'error' } : p
            )
          );
        } catch (imgError) {
          console.error(`Failed to generate image for panel ${i + 1}:`, imgError);
          setPanels(currentPanels => 
            currentPanels.map((p, index) => 
              index === i ? { ...p, status: 'error' } : p
            )
          );
        }
      }
    } catch (err) {
      console.error('Failed to parse script:', err);
      setError('An error occurred while analyzing the script. Please try another script or try again later.');
      setIsParsing(false);
    }
  };

  const reset = () => {
    setScriptText('');
    setPanels([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-indigo-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Film className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-medium tracking-tight text-white">StoryFlow</h1>
          </div>
          {panels.length > 0 && (
            <button 
              onClick={reset}
              className="text-sm font-medium text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              New Script
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <AnimatePresence mode="wait">
          {panels.length === 0 ? (
            <motion.div 
              key="input-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-3xl mx-auto flex flex-col gap-8"
            >
              <div className="text-center space-y-4">
                <h2 className="text-4xl lg:text-5xl font-medium tracking-tight text-white">
                  Visualize your story
                </h2>
                <p className="text-lg text-neutral-400 max-w-xl mx-auto leading-relaxed">
                  Upload your script or paste it directly. Our AI will analyze the scenes and draw a complete storyboard sequence.
                </p>
              </div>

              <div className="bg-neutral-900 border border-white/5 rounded-2xl p-6 shadow-2xl">
                {/* Text Area */}
                <textarea
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  placeholder="EXT. DESERT - DAY

A lone figure trudges through the endless dunes. The sun beats down unmercifully. He stops, seeing a metallic glint in the sand..."
                  className="w-full h-64 bg-transparent resize-none outline-none text-neutral-300 placeholder:text-neutral-600 font-serif leading-relaxed text-lg"
                  disabled={isParsing}
                />
                
                <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
                  <div className="w-full sm:w-auto flex items-center gap-4">
                    <input 
                      type="file" 
                      accept=".txt" 
                      className="hidden" 
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isParsing}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm font-medium transition-colors border border-white/5"
                    >
                      <UploadCloud className="w-4 h-4" />
                      Upload .txt
                    </button>
                  </div>
                  
                  <button
                    onClick={handleGenerate}
                    disabled={isParsing || !scriptText.trim()}
                    className={cn(
                      "flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all shadow-lg",
                      isParsing 
                        ? "bg-indigo-600/50 text-indigo-200 cursor-not-allowed"
                        : (!scriptText.trim() ? "bg-neutral-800 text-neutral-500 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-indigo-500/25")
                    )}
                  >
                    {isParsing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing Script...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        Generate Storyboard
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm font-medium text-center"
                >
                  {error}
                </motion.div>
              )}
            </motion.div>
          ) : (
             <motion.div 
              key="results-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-12"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-2">
                  <h2 className="text-3xl font-medium text-white tracking-tight">Storyboard Sequence</h2>
                  <p className="text-neutral-400">
                    Generated {panels.length} panels from your script.
                  </p>
                </div>
                
                <div className="flex items-center gap-3 bg-neutral-900 border border-white/5 rounded-xl px-4 py-2 text-sm text-neutral-400">
                  <FileText className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">{scriptText.slice(0, 50)}...</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {panels.map((panel, idx) => (
                  <motion.div 
                    key={panel.panelNumber}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex flex-col gap-4 group"
                  >
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-900 border border-white/5 flex items-center justify-center">
                      {panel.status === 'pending' || panel.status === 'generating' ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-neutral-500">
                            {panel.status === 'generating' ? (
                                <motion.div 
                                    animate={{ rotate: 360 }} 
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                >
                                    <Loader2 className="w-8 h-8" />
                                </motion.div>
                            ) : (
                                <Film className="w-8 h-8 opacity-20" />
                            )}
                            <span className="text-xs font-medium tracking-wider uppercase">
                                {panel.status === 'generating' ? 'Drawing...' : 'Waiting...'}
                            </span>
                        </div>
                      ) : panel.status === 'completed' && panel.imageUrl ? (
                        <img 
                          src={panel.imageUrl} 
                          alt={`Panel ${panel.panelNumber}`} 
                          className="w-full h-full object-cover grayscale opacity-90 group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-700"
                        />
                      ) : (
                        <div className="text-center text-red-500/80 px-4">
                            <span className="text-sm font-medium">Failed to generate image.</span>
                        </div>
                      )}
                      
                      {/* Frame Number Badge */}
                      <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 px-3 py-1 rounded-full flex items-center gap-2">
                        <span className="text-xs font-mono text-neutral-300 font-bold">
                            FRAME {String(panel.panelNumber).padStart(2, '0')}
                        </span>
                      </div>
                    </div>

                    <div className="px-1 text-sm leading-relaxed text-neutral-300">
                      {panel.description}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
