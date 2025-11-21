import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlaybackState, Track, DJSession } from './types';
import * as GeminiService from './services/geminiService';
import DjBooth from './components/DjBooth';
import Player from './components/Player';

const App: React.FC = () => {
  // --- State ---
  const [session, setSession] = useState<DJSession | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>(PlaybackState.IDLE);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [djText, setDjText] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // --- Refs for Audio Management ---
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const trackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Helpers ---
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  // --- Core Orchestration ---

  const startSession = async (prompt: string) => {
    setIsLoading(true);
    try {
      // 1. Generate Session Data
      const { tracks, introScript } = await GeminiService.generatePlaylist(prompt);
      
      // 2. Initialize Session State
      setSession({
        mood: prompt,
        tracks: tracks,
        currentTrackIndex: -1,
        history: []
      });
      setQueue(tracks);

      // 3. Generate Intro Audio
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();
      
      const introAudio = await GeminiService.generateSpeechAudio(introScript, ctx);

      // 4. Play Intro Commentary
      playCommentary(introAudio, introScript);
    } catch (error) {
      console.error("Failed to start session:", error);
      alert("Could not start DJ session. Check API Key.");
      setPlaybackState(PlaybackState.IDLE);
    } finally {
      setIsLoading(false);
    }
  };

  const playCommentary = (buffer: AudioBuffer, text: string) => {
    setPlaybackState(PlaybackState.PLAYING_COMMENTARY);
    setDjText(text);

    const ctx = getAudioContext();
    if (audioSourceRef.current) audioSourceRef.current.stop();
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    source.onended = () => {
      playNextTrack();
    };

    audioSourceRef.current = source;
    source.start();
  };

  const playNextTrack = async () => {
    setDjText(null);
    
    setQueue(prevQueue => {
      if (prevQueue.length === 0) return [];
      const [next, ...rest] = prevQueue;
      
      setCurrentTrack(next);
      setPlaybackState(PlaybackState.PLAYING_TRACK);
      
      // Simulate Track Duration
      // In a real app, this would be an <audio> element or SDK event
      if (trackTimerRef.current) clearTimeout(trackTimerRef.current);
      
      // Mock duration: 10 seconds for demo purposes, or use a fraction of the real duration
      const simulatedDuration = 10000; 
      
      trackTimerRef.current = setTimeout(() => {
        handleTrackEnd(next, rest);
      }, simulatedDuration);

      return rest;
    });
  };

  const handleTrackEnd = async (finishedTrack: Track, remainingQueue: Track[]) => {
    // Decide whether to play commentary or next track
    // For demo: Play commentary every 2 tracks or if queue is low
    const shouldPlayCommentary = Math.random() > 0.5; 

    if (remainingQueue.length > 0) {
      const nextTrack = remainingQueue[0];
      
      if (shouldPlayCommentary && session) {
        try {
          setPlaybackState(PlaybackState.LOADING_SESSION); // Show a loading state briefly if needed
          // Generate Interlude
          const script = await GeminiService.generateInterludeScript(finishedTrack, nextTrack, session.mood);
          const ctx = getAudioContext();
          const audio = await GeminiService.generateSpeechAudio(script, ctx);
          playCommentary(audio, script);
        } catch (e) {
          console.warn("Commentary generation failed, skipping to track", e);
          playNextTrack(); // Fallback
        }
      } else {
        playNextTrack();
      }
    } else {
      // End of Queue - In real app, generate more tracks here
      setPlaybackState(PlaybackState.IDLE);
      alert("Session ended. (Queue refill logic would go here)");
    }
  };

  const handleSkip = () => {
    if (audioSourceRef.current) audioSourceRef.current.stop();
    if (trackTimerRef.current) clearTimeout(trackTimerRef.current);
    playNextTrack();
  };

  const handleTogglePlay = () => {
    if (playbackState === PlaybackState.PLAYING_TRACK) {
       setPlaybackState(PlaybackState.PAUSED);
       // Pause logic for timer... (Simplified: just stop timer)
       if (trackTimerRef.current) clearTimeout(trackTimerRef.current);
    } else if (playbackState === PlaybackState.PAUSED) {
       setPlaybackState(PlaybackState.PLAYING_TRACK);
       // Resume logic (Simplified: just restart next track call)
       trackTimerRef.current = setTimeout(() => {
          if (currentTrack && queue) handleTrackEnd(currentTrack, queue);
       }, 2000);
    }
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-hidden selection:bg-cyan-500 selection:text-black">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-fuchsia-900/20 blur-[128px]" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[60%] rounded-full bg-cyan-900/20 blur-[128px]" />
      </div>

      <div className="relative z-10 h-full min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex justify-between items-center">
           <div className="font-display font-bold text-2xl tracking-tighter flex items-center gap-2">
              <div className="w-8 h-8 bg-white text-black flex items-center justify-center rounded font-black">T</div>
              TIDAL
           </div>
           <div className="text-xs text-zinc-500 border border-zinc-800 px-2 py-1 rounded">
              BETA // AI DJ
           </div>
        </header>

        {/* Main View Switcher */}
        <main className="flex-1 flex items-center justify-center">
          {playbackState === PlaybackState.IDLE || playbackState === PlaybackState.LOADING_SESSION && !currentTrack ? (
            <DjBooth onStartSession={startSession} isLoading={isLoading} />
          ) : (
            <Player 
              currentTrack={currentTrack}
              nextTracks={queue}
              playbackState={playbackState}
              djCommentaryText={djText}
              onSkip={handleSkip}
              onTogglePlay={handleTogglePlay}
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;