
export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // In seconds (simulated or real preview length)
  coverUrl: string;
  moodTag: string;
  reason?: string; // Why the AI picked this
  previewUrl?: string | null; // Spotify preview URL
}

export enum PlaybackState {
  IDLE = 'IDLE',
  LOADING_SESSION = 'LOADING_SESSION',
  PLAYING_COMMENTARY = 'PLAYING_COMMENTARY',
  PLAYING_TRACK = 'PLAYING_TRACK',
  PAUSED = 'PAUSED',
}

export interface DJSession {
  mood: string;
  tracks: Track[];
  currentTrackIndex: number;
  history: string[]; // IDs of played tracks
}

export interface CommentaryConfig {
  text: string;
  audioBuffer: AudioBuffer | null;
}
