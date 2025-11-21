import React, { useState } from 'react';
import { Disc, Mic2, Play, Sparkles } from 'lucide-react';

interface DjBoothProps {
  onStartSession: (prompt: string) => void;
  isLoading: boolean;
}

const DjBooth: React.FC<DjBoothProps> = ({ onStartSession, isLoading }) => {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim()) {
      onStartSession(prompt);
    }
  };

  const suggestions = [
    "Late night coding session in a neon city",
    "Sunday morning coffee with acoustic vibes",
    "High energy gym workout with 90s hip hop",
    "Dreamy psychedelic rock journey"
  ];

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="mb-8 text-center space-y-2">
        <h2 className="text-4xl font-display font-bold tracking-tighter text-white">
          TIDAL <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-500">AI DJ</span>
        </h2>
        <p className="text-zinc-400 text-lg">
          Describe your vibe. The AI curates the music and the commentary.
        </p>
      </div>

      <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 rounded-2xl p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., A rainy cyberpunk night in Tokyo..."
              className="w-full h-32 bg-zinc-950 border border-zinc-700 rounded-xl p-4 text-lg text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none transition-all"
              disabled={isLoading}
            />
            <div className="absolute bottom-3 right-3 text-zinc-600">
              <Sparkles size={20} />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPrompt(s)}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-full transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={!prompt.trim() || isLoading}
            className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all transform hover:scale-[1.01] ${
              isLoading 
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'
            }`}
          >
            {isLoading ? (
              <>
                <Disc className="animate-spin" /> Curator Working...
              </>
            ) : (
              <>
                <Play fill="currentColor" /> Start Session
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default DjBooth;