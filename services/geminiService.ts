
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Track } from "../types";
import { decodeBase64, decodeAudioData } from "./audioUtils";
import { searchSpotifyTrack } from "./spotifyService";

// Helper to get the client instance with the latest key
const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

const getRandomImage = (id: number) => `https://picsum.photos/seed/${id}/400/400`;

/**
 * Generates a playlist based on the user's mood/prompt.
 * Uses Gemini to pick songs, then Spotify to fetch metadata.
 */
export const generatePlaylist = async (mood: string): Promise<{ tracks: Track[], introScript: string }> => {
  const ai = getAiClient();

  const prompt = `
    You are a world-class radio DJ for a high-end music streaming service called TIDAL.
    The user wants a session with this vibe: "${mood}".
    
    1. Create a playlist of 5 distinct, real songs that fit this vibe perfectly.
    2. Write a short, punchy, 2-sentence intro script for yourself (The AI DJ) to start the session. Keep it cool, welcome the listener, and mention the vibe. Do NOT use "DJ:" prefix.
    
    Output JSON format:
    {
      "introScript": "string",
      "tracks": [
        {
          "title": "string (Exact song title)",
          "artist": "string (Exact artist name)",
          "moodTag": "string (e.g. 'Gritty', 'Chill')",
          "reason": "string (short reason for selection)"
        }
      ]
    }
  `;

  let json;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            introScript: { type: Type.STRING },
            tracks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  artist: { type: Type.STRING },
                  moodTag: { type: Type.STRING },
                  reason: { type: Type.STRING },
                }
              }
            }
          }
        }
      }
    });

    let jsonStr = response.text || "{}";
    jsonStr = jsonStr.replace(/```json\n?|```/g, "").trim();
    json = JSON.parse(jsonStr);
  } catch (e: any) {
    console.error("Gemini generation failed:", e);
    throw new Error("Failed to generate playlist data.");
  }

  const rawTracks = json.tracks || [];
  const enrichedTracks: Track[] = [];

  // Enrich with Spotify Data
  for (let i = 0; i < rawTracks.length; i++) {
    const t = rawTracks[i];
    const query = `${t.title} ${t.artist}`;
    const spotifyData = await searchSpotifyTrack(query);

    if (spotifyData) {
      enrichedTracks.push({
        id: `track-${Date.now()}-${i}`,
        title: spotifyData.title,
        artist: spotifyData.artist,
        album: spotifyData.album,
        duration: spotifyData.duration, // Using simulated duration or preview length
        coverUrl: spotifyData.coverUrl,
        moodTag: t.moodTag || "Vibe",
        reason: t.reason,
        previewUrl: spotifyData.previewUrl
      });
    } else {
      // Fallback if Spotify fails
      enrichedTracks.push({
        id: `track-${Date.now()}-${i}`,
        title: t.title || "Unknown Title",
        artist: t.artist || "Unknown Artist",
        album: "Unknown Album",
        duration: 30000, // Default 30s
        coverUrl: getRandomImage(i),
        moodTag: t.moodTag || "Vibe",
        reason: t.reason,
        previewUrl: null
      });
    }
  }

  return {
    tracks: enrichedTracks,
    introScript: json.introScript || "Welcome to your personalized session."
  };
};

/**
 * Generates an interlude script between two tracks.
 */
export const generateInterludeScript = async (prevTrack: Track, nextTrack: Track, mood: string): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `
      You are a DJ. 
      Current Vibe: ${mood}.
      Just finished: "${prevTrack.title}" by ${prevTrack.artist}.
      Next up: "${nextTrack.title}" by ${nextTrack.artist}.
      
      Write a very short (1-2 sentences), smooth transition script. 
      Mention a fun fact about the artist or why these songs fit together.
      Make it sound conversational and cool. No "DJ:" prefix.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text || `Next up is ${nextTrack.title}.`;
  } catch (error) {
    console.warn("Failed to generate interlude:", error);
    return `Next up is ${nextTrack.title}.`;
  }
};

/**
 * Converts text to speech using Gemini TTS.
 */
export const generateSpeechAudio = async (text: string, audioContext: AudioContext): Promise<AudioBuffer> => {
  const ai = getAiClient();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Fenrir' }, 
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  
  if (!base64Audio) {
    throw new Error("No audio data returned from Gemini");
  }

  const audioBytes = decodeBase64(base64Audio);
  return await decodeAudioData(audioBytes, audioContext, 24000, 1);
};
