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

export interface EmotionalFingerprint {
  arc: string[];
  signatureMove: string;
  reachForThisWhen: string;
}

export interface SongInfo {
  emotionalFingerprint: EmotionalFingerprint;
  summary: string;
  musicalAnalysis: SongInfoMusicalAnalysis;
  genre: string[];
  culturalContext: SongInfoCulturalContext;
  credits: SongInfoCredit[];
  highlights: string[];
  sources: SongInfoSource[];
}
