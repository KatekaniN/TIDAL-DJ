import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Track } from "../types";
import { decodeBase64, decodeAudioData } from "./audioUtils";

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
 */
export const generatePlaylist = async (mood: string): Promise<{ tracks: Track[], introScript: string }> => {
  const ai = getAiClient();

  const prompt = `
    You are a world-class radio DJ for a high-end music streaming service called TIDAL.
    The user wants a session with this vibe: "${mood}".
    
    1. Create a playlist of 5 distinct songs that fit this vibe perfectly.
    2. Write a short, punchy, 2-sentence intro script for yourself (The AI DJ) to start the session. Keep it cool, welcome the listener, and mention the vibe. Do NOT use "DJ:" prefix.
    
    Output JSON format:
    {
      "introScript": "string",
      "tracks": [
        {
          "title": "string",
          "artist": "string",
          "album": "string",
          "moodTag": "string (e.g. 'Gritty', 'Chill')",
          "reason": "string (short reason for selection)"
        }
      ]
    }
  `;

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
                album: { type: Type.STRING },
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
  // Defensive cleanup in case of markdown wrapping
  jsonStr = jsonStr.replace(/```json\n?|```/g, "").trim();

  let json;
  try {
    json = JSON.parse(jsonStr);
  } catch (e) {
    console.error("Failed to parse JSON:", jsonStr);
    throw new Error("AI response was not valid JSON.");
  }
  
  // Map to our Track interface
  const tracks: Track[] = (json.tracks || []).map((t: any, i: number) => ({
    id: `track-${Date.now()}-${i}`,
    title: t.title || "Unknown Title",
    artist: t.artist || "Unknown Artist",
    album: t.album || "Unknown Album",
    duration: 180 + Math.floor(Math.random() * 60), // Simulated duration 3-4 mins
    coverUrl: getRandomImage(Math.floor(Math.random() * 10000)),
    moodTag: t.moodTag || "Vibe",
    reason: t.reason
  }));

  return {
    tracks,
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
          prebuiltVoiceConfig: { voiceName: 'Fenrir' }, // 'Fenrir' has a deeper, more DJ-like tone usually
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