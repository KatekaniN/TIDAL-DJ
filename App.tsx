
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlaybackState, Track, DJSession } from './types';
import * as GeminiService from './services/geminiService';
import DjBooth from './components/DjBooth';
import Player from './components/Player';

// A fallback track (Lo-Fi Beat) to play if Spotify preview is missing
// using a public domain or creative commons sample URL.
const FALLBACK_AUDIO_URL = "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=lofi-study-112191.mp3"; 

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
  const voiceSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const trackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Helpers ---
  const getAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const stopAllAudio = () => {
    // Stop Voice
    if (voiceSourceRef.current) {
      try { voiceSourceRef.current.stop(); } catch(e) {}
    }
    // Stop Music
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current = null;
    }
    // Clear Timers
    if (trackTimerRef.current) clearTimeout(trackTimerRef.current);
  };

  // --- Core Orchestration ---

  const startSession = async (prompt: string) => {
    // CRITICAL: Resume AudioContext immediately on user interaction (click)
    const ctx = getAudioContext();
    try {
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
    } catch (e) {
      console.warn("Failed to resume audio context:", e);
    }

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
      const introAudio = await GeminiService.generateSpeechAudio(introScript, ctx);

      // 4. Play Intro Commentary
      playCommentary(introAudio, introScript);
    } catch (error: any) {
      console.error("Failed to start session:", error);
      alert(`Could not start DJ session. Error: ${error.message || 'Unknown error'}`);
      setPlaybackState(PlaybackState.IDLE);
    } finally {
      setIsLoading(false);
    }
  };

  const playCommentary = (buffer: AudioBuffer, text: string) => {
    stopAllAudio();
    setPlaybackState(PlaybackState.PLAYING_COMMENTARY);
    setDjText(text);

    const ctx = getAudioContext();
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    
    source.onended = () => {
      playNextTrack();
    };

    voiceSourceRef.current = source;
    source.start();
  };

  const playNextTrack = async () => {
    stopAllAudio();
    setDjText(null);
    
    setQueue(prevQueue => {
      if (prevQueue.length === 0) return [];
      const [next, ...rest] = prevQueue;
      
      setCurrentTrack(next);
      setPlaybackState(PlaybackState.PLAYING_TRACK);
      
      // Determine Audio URL (Real Spotify Preview or Fallback)
      const audioUrl = next.previewUrl || FALLBACK_AUDIO_URL;
      
      const audio = new Audio(audioUrl);
      audio.volume = 0.6;
      
      // Play the audio
      audio.play().catch(e => console.warn("Auto-play failed or blocked", e));
      
      // When audio ends (or after 30s for fallback), go next
      audio.onended = () => {
        handleTrackEnd(next, rest);
      };

      // Safety timeout in case audio hangs or is infinite stream
      // Spotify previews are 30s. Fallback is longer, so we cap it at 30s to keep flow.
      trackTimerRef.current = setTimeout(() => {
          if (!audio.paused) {
              audio.pause();
              handleTrackEnd(next, rest);
          }
      }, 30000);

      musicAudioRef.current = audio;

      return rest;
    });
  };

  const handleTrackEnd = async (finishedTrack: Track, remainingQueue: Track[]) => {
    // Decide whether to play commentary or next track
    // Play commentary with 60% chance if we have tracks left
    const shouldPlayCommentary = Math.random() > 0.4; 

    if (remainingQueue.length > 0) {
      const nextTrack = remainingQueue[0];
      
      if (shouldPlayCommentary && session) {
        try {
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
      setPlaybackState(PlaybackState.IDLE);
      alert("Session ended. In a full version, we'd fetch more tracks now!");
    }
  };

  const handleSkip = () => {
    stopAllAudio();
    playNextTrack();
  };

  const handleTogglePlay = () => {
    const ctx = getAudioContext();
    
    if (playbackState === PlaybackState.PLAYING_TRACK) {
       // Pause
       setPlaybackState(PlaybackState.PAUSED);
       if (musicAudioRef.current) musicAudioRef.current.pause();
       if (trackTimerRef.current) clearTimeout(trackTimerRef.current);
       if (ctx.state === 'running') ctx.suspend();

    } else if (playbackState === PlaybackState.PAUSED) {
       // Resume
       setPlaybackState(PlaybackState.PLAYING_TRACK);
       if (ctx.state === 'suspended') ctx.resume();
       
       if (musicAudioRef.current) {
         musicAudioRef.current.play();
         
         // Restore timeout for remaining duration? 
         // For simplicity in this demo, we restart the safety timer or rely on onended
       } else {
          // Should not happen in new logic, but just in case
          playNextTrack();
       }
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
          {playbackState === PlaybackState.IDLE || (playbackState === PlaybackState.LOADING_SESSION && !currentTrack) ? (
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
