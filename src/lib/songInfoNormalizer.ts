import type {
  EmotionalFingerprint,
  FindingConfidence,
  SongInfo,
  SongInfoAudioFeatures,
  SongInfoCredit,
  SongInfoCulturalContext,
  SongInfoFinding,
  SongInfoMusicalAnalysis,
  SongInfoSource,
} from '../types/song-info';
import { safeUrl } from './safeUrl';

type UnknownRecord = Record<string, unknown>;

const CONFIDENCE = new Set<FindingConfidence>(['verified', 'inferred', 'speculative']);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function source(value: unknown): SongInfoSource | null {
  if (!isRecord(value)) return null;
  const label = text(value.label);
  const url = safeUrl(text(value.url));
  return label && url ? { label, url } : null;
}

function emotionalFingerprint(value: unknown): EmotionalFingerprint | undefined {
  if (!isRecord(value)) return undefined;
  const arc = textList(value.arc);
  const signatureMove = text(value.signatureMove);
  const reachForThisWhen = text(value.reachForThisWhen);
  return arc.length > 0 && signatureMove && reachForThisWhen
    ? { arc, signatureMove, reachForThisWhen }
    : undefined;
}

function musicalAnalysis(value: unknown): SongInfoMusicalAnalysis | undefined {
  if (!isRecord(value)) return undefined;
  const mood = text(value.mood);
  const keyElements = textList(value.keyElements);
  const soundscape = text(value.soundscape);
  return mood || keyElements.length > 0 || soundscape
    ? { mood, keyElements, soundscape }
    : undefined;
}

function culturalContext(value: unknown): SongInfoCulturalContext | undefined {
  if (!isRecord(value)) return undefined;
  const era = text(value.era);
  const influence = text(value.influence);
  const connections = textList(value.connections);
  return era || influence || connections.length > 0
    ? { era, influence, connections }
    : undefined;
}

function credits(value: unknown): SongInfoCredit[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const name = text(entry.name);
    const role = text(entry.role);
    const knownFor = text(entry.knownFor);
    if (!name || !role) return [];
    return [{ name, role, ...(knownFor ? { knownFor } : {}) }];
  });
}

function findings(value: unknown): SongInfoFinding[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry)) return [];
    const findingText = text(entry.text);
    const confidence = text(entry.confidence) as FindingConfidence;
    if (!findingText || !CONFIDENCE.has(confidence)) return [];
    return [{
      text: findingText,
      confidence,
      source: source(entry.source),
    }];
  });
}

function audioFeatures(value: unknown): SongInfoAudioFeatures | undefined {
  if (!isRecord(value)) return undefined;
  const featureNames = [
    'tempo',
    'danceability',
    'energy',
    'valence',
    'acousticness',
    'instrumentalness',
  ] as const;
  const values = Object.fromEntries(featureNames.map((name) => [name, value[name]]));
  if (featureNames.some((name) => typeof values[name] !== 'number' || !Number.isFinite(values[name]))) {
    return undefined;
  }
  const featureSource = value.source === 'spotify' || value.source === 'estimated'
    ? value.source
    : undefined;
  const key = text(value.key);
  if (!featureSource || !key || (values.tempo as number) <= 0) return undefined;

  return {
    source: featureSource,
    tempo: values.tempo as number,
    key,
    danceability: Math.max(0, Math.min(1, values.danceability as number)),
    energy: Math.max(0, Math.min(1, values.energy as number)),
    valence: Math.max(0, Math.min(1, values.valence as number)),
    acousticness: Math.max(0, Math.min(1, values.acousticness as number)),
    instrumentalness: Math.max(0, Math.min(1, values.instrumentalness as number)),
  };
}

export function normalizeSongInfo(value: unknown): SongInfo {
  const report = isRecord(value) ? value : {};
  return {
    summary: text(report.summary),
    emotionalFingerprint: emotionalFingerprint(report.emotionalFingerprint),
    musicalAnalysis: musicalAnalysis(report.musicalAnalysis),
    sonicRead: text(report.sonicRead),
    audioFeatures: audioFeatures(report.audioFeatures),
    culturalContext: culturalContext(report.culturalContext),
    credits: credits(report.credits),
    findings: findings(report.findings),
    genre: textList(report.genre),
    sources: Array.isArray(report.sources)
      ? report.sources.flatMap((entry) => {
          const normalized = source(entry);
          return normalized ? [normalized] : [];
        })
      : [],
  };
}

export function hasSongInfoContent(report: SongInfo): boolean {
  return Boolean(
    report.summary
    || report.emotionalFingerprint
    || report.musicalAnalysis
    || report.audioFeatures
    || report.culturalContext
    || report.credits.length
    || report.findings.length
    || report.genre.length
    || report.sources.length
  );
}
