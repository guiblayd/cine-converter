
import { GoogleGenAI, Type } from "@google/genai";
import { Movie } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseFilmowData = async (rawText: string): Promise<Movie[]> => {
  if (!rawText || rawText.length < 2) return [];

  try {
    const parsed = JSON.parse(rawText);
    const potentialMovies = Array.isArray(parsed) ? parsed : (parsed.movies || parsed.results || []);
    
    if (Array.isArray(potentialMovies) && potentialMovies.length > 0) {
      return potentialMovies.map((m: any) => ({
        title: String(m.title || m.name || m.titulo || ""),
        year: m.year || m.ano || "",
        rating: m.rating !== undefined && m.rating !== null ? m.rating : (m.nota || m.score || ""),
        isFavorite: !!m.isFavorite || !!m.favorito,
        comment: m.comment || m.comentario || "",
        listType: m.listType || 'watched'
      })).filter(m => m.title.trim() !== "");
    }
  } catch (e) {
    console.warn("Local JSON parse failed, falling back to AI...", e);
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `
        Extraia títulos, anos, notas (0-10), se é favorito (boolean), comentários de filmes e tipo de lista (watched ou watchlist).
        Retorne apenas JSON: {"movies": [{"title": "String", "year": "String", "rating": "String", "isFavorite": boolean, "comment": "String", "listType": "watched|watchlist"}]}
        DADOS:
        ${rawText.substring(0, 15000)}
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            movies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  year: { type: Type.STRING },
                  rating: { type: Type.STRING },
                  isFavorite: { type: Type.BOOLEAN },
                  comment: { type: Type.STRING },
                  listType: { type: Type.STRING, description: "Either 'watched' or 'watchlist'" },
                },
                required: ["title"]
              }
            }
          },
          required: ["movies"]
        }
      }
    });

    const text = response.text || '{"movies": []}';
    const data = JSON.parse(text);
    return data.movies || [];
  } catch (error) {
    console.error("AI Extraction Error:", error);
    return [];
  }
};
