
const CLIENT_ID = "";
const CLIENT_SECRET = '';

let accessToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Retrieves a valid access token using the Client Credentials flow.
 */
async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const authString = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  
  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`Spotify Auth Failed: ${response.statusText}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    // Token usually lasts 3600 seconds. Set expiry a bit earlier for safety.
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
    
    return accessToken as string;
  } catch (error) {
    console.error("Error getting Spotify token:", error);
    throw error;
  }
}

/**
 * Searches for a track on Spotify and returns the top result's metadata.
 * PRIORITIZES tracks that have a valid preview_url.
 */
export async function searchSpotifyTrack(query: string) {
  try {
    const token = await getAccessToken();
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) return null;

    const data = await response.json();
    const items = data.tracks?.items || [];

    if (items.length === 0) return null;

    // 1. Try to find a track with a preview_url
    let selectedTrack = items.find((item: any) => item.preview_url);

    // 2. If none found, fallback to the first result (visuals only, no audio)
    if (!selectedTrack) {
        selectedTrack = items[0];
    }

    return {
      title: selectedTrack.name,
      artist: selectedTrack.artists.map((a: any) => a.name).join(', '),
      album: selectedTrack.album.name,
      coverUrl: selectedTrack.album.images[0]?.url || '',
      previewUrl: selectedTrack.preview_url, // May still be null if no results had previews
      duration: 30000, // Spotify previews are fixed at 30s
      spotifyUri: selectedTrack.uri
    };
  } catch (error) {
    console.warn(`Spotify search failed for "${query}":`, error);
    return null;
  }
}
