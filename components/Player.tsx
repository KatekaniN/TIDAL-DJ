import React, { useEffect, useState } from 'react';
import { Track, PlaybackState } from '../types';
import { SkipForward, Pause, Play, Mic, ListMusic } from 'lucide-react';
import Visualizer from './Visualizer';

interface PlayerProps {
  currentTrack: Track | null;
  nextTracks: Track[];
  playbackState: PlaybackState;
  djCommentaryText: string | null;
  onSkip: () => void;
  onTogglePlay: () => void;
}

const Player: React.FC<PlayerProps> = ({
  currentTrack,
  nextTracks,
  playbackState,
  djCommentaryText,
  onSkip,
  onTogglePlay
}) => {
  const [progress, setProgress] = useState(0);

  // Simulated progress bar
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (playbackState === PlaybackState.PLAYING_TRACK && currentTrack) {
      interval = setInterval(() => {
        setProgress((prev) => (prev < 100 ? prev + 0.5 : 100));
      }, 100);
    } else if (playbackState !== PlaybackState.PAUSED) {
      setProgress(0);
    }
    return () => clearInterval(interval);
  }, [playbackState, currentTrack]);

  const isDJing = playbackState === PlaybackState.PLAYING_COMMENTARY;
  const isPlaying = playbackState === PlaybackState.PLAYING_TRACK || isDJing;

  if (!currentTrack && !isDJing) return null;

  return (
    <div className="flex flex-col h-full max-w-6xl mx-auto w-full">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:flex-row gap-8 p-6 md:p-12 items-center justify-center">
        
        {/* Album Art / DJ Avatar */}
        <div className="relative w-64 h-64 md:w-96 md:h-96 flex-shrink-0 group">
            <div className={`absolute inset-0 rounded-2xl blur-2xl transition-all duration-1000 ${
                isDJing ? 'bg-cyan-500/30' : 'bg-fuchsia-500/20'
            }`}></div>
            
            {isDJing ? (
                 <div className="w-full h-full bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden shadow-2xl z-10">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950/90 z-10" />
                    <Mic size={64} className="text-cyan-400 mb-4 relative z-20 animate-pulse" />
                    <h3 className="text-cyan-400 font-display font-bold text-2xl relative z-20 tracking-widest">AI DJ</h3>
                    <div className="absolute bottom-0 w-full h-32 z-20 px-4">
                       <Visualizer isActive={true} mode="voice" />
                    </div>
                 </div>
            ) : (
                <img 
                    src={currentTrack?.coverUrl} 
                    alt="Album Art" 
                    className="w-full h-full object-cover rounded-2xl shadow-2xl z-10 relative border border-zinc-800"
                />
            )}
        </div>

        {/* Track Info / Commentary Text */}
        <div className="flex-1 w-full flex flex-col justify-center space-y-6 text-center md:text-left">
            {isDJing ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-800 text-cyan-400 text-sm font-semibold">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                        </span>
                        ON AIR
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                        "{djCommentaryText}"
                    </h2>
                </div>
            ) : (
                <div className="space-y-2 animate-in fade-in duration-500">
                     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-950/50 border border-fuchsia-800 text-fuchsia-400 text-sm font-semibold">
                        NOW PLAYING
                    </div>
                    <h1 className="text-4xl md:text-6xl font-display font-bold text-white tracking-tight">{currentTrack?.title}</h1>
                    <p className="text-2xl md:text-3xl text-zinc-400">{currentTrack?.artist}</p>
                    <p className="text-zinc-500 text-lg">{currentTrack?.album}</p>
                </div>
            )}

            {/* Progress Bar (Only for music) */}
            {!isDJing && (
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                        className="bg-white h-full rounded-full transition-all duration-300 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            )}

            {/* Controls */}
            <div className="flex items-center justify-center md:justify-start gap-6 pt-4">
                <button 
                    onClick={onTogglePlay}
                    className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform"
                >
                    {isPlaying ? <Pause fill="black" size={28} /> : <Play fill="black" size={28} className="ml-1"/>}
                </button>
                <button 
                    onClick={onSkip}
                    className="text-zinc-400 hover:text-white transition-colors"
                >
                    <SkipForward size={32} />
                </button>
            </div>
        </div>
      </div>

      {/* Queue (Up Next) */}
      <div className="border-t border-zinc-800 bg-zinc-900/30 backdrop-blur-sm p-6 h-auto md:h-48 overflow-hidden">
         <div className="flex items-center gap-2 text-zinc-400 mb-4 text-sm font-semibold uppercase tracking-wider">
            <ListMusic size={16} /> Up Next
         </div>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {nextTracks.slice(0, 3).map((track, idx) => (
                <div key={track.id} className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800/40 hover:bg-zinc-800/60 transition-colors group">
                    <img src={track.coverUrl} alt="" className="w-12 h-12 rounded bg-zinc-700 object-cover" />
                    <div className="overflow-hidden">
                        <p className="text-white font-medium truncate group-hover:text-cyan-300 transition-colors">{track.title}</p>
                        <p className="text-zinc-500 text-sm truncate">{track.artist}</p>
                    </div>
                    <div className="ml-auto text-xs text-zinc-600 bg-zinc-900 px-2 py-1 rounded">
                        {track.moodTag}
                    </div>
                </div>
            ))}
            {nextTracks.length === 0 && (
                 <div className="text-zinc-600 italic text-sm">Curating more tracks...</div>
            )}
         </div>
      </div>
    </div>
  );
};

export default Player;