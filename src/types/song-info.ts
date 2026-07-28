export interface SongInfoCredit {
  name: string;
  role: string;
  knownFor?: string;
}

export interface SongInfoMusicalAnalysis {
  mood: string;
  keyElements: string[];
  soundscape: string;
}

export interface SongInfoCulturalContext {
  era: string;
  influence: string;
  connections?: string[];
}

export interface SongInfoSource {
  label: string;
  url: string;
}

export interface SongInfo {
  summary: string;
  musicalAnalysis: SongInfoMusicalAnalysis;
  genre: string[];
  culturalContext: SongInfoCulturalContext;
  credits: SongInfoCredit[];
  highlights: string[];
  sources: SongInfoSource[];
}
