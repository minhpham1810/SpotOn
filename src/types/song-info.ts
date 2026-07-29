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

export type FindingConfidence = 'verified' | 'inferred' | 'speculative';

export interface SongInfoFinding {
  text: string;
  confidence: FindingConfidence;
  source: SongInfoSource | null;
}

export interface SongInfoAudioFeatures {
  source: 'spotify' | 'estimated';
  tempo: number;
  key: string;
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
}

export interface SongInfo {
  emotionalFingerprint: EmotionalFingerprint;
  summary: string;
  musicalAnalysis: SongInfoMusicalAnalysis;
  sonicRead: string;
  audioFeatures?: SongInfoAudioFeatures;
  genre: string[];
  culturalContext: SongInfoCulturalContext;
  credits: SongInfoCredit[];
  findings: SongInfoFinding[];
  sources: SongInfoSource[];
}
