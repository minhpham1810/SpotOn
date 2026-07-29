import { describe, expect, test } from 'vitest';
import { hasSongInfoContent, normalizeSongInfo } from './songInfoNormalizer';

describe('normalizeSongInfo', () => {
  test('filters malformed nested entries without discarding valid report content', () => {
    const report = normalizeSongInfo({
      summary: '  A concise summary.  ',
      emotionalFingerprint: {
        arc: [' Guarded ', null, '', 42, 'Open'],
        signatureMove: '  A late lift. ',
        reachForThisWhen: ' Reflection ',
      },
      musicalAnalysis: {
        mood: ' Calm ',
        keyElements: [' Piano ', null, '', 12],
        soundscape: ' Wide ',
      },
      sonicRead: ' Warm and close. ',
      audioFeatures: {
        source: 'estimated',
        tempo: 95,
        key: ' A minor ',
        danceability: 0.5,
        energy: 2,
        valence: -1,
        acousticness: 0.6,
        instrumentalness: Number.NaN,
      },
      culturalContext: {
        era: ' 2020s ',
        influence: ' Bedroom pop ',
        connections: [' Artist A ', null, ''],
      },
      credits: [
        { name: ' Producer ', role: ' Production ', knownFor: ' Other song ' },
        null,
        { name: '', role: 'Writer' },
        { name: 'No role' },
      ],
      findings: [
        {
          text: ' Verified detail ',
          confidence: 'verified',
          source: { label: ' Source ', url: ' https://example.com/report ' },
        },
        null,
        { text: '', confidence: 'inferred', source: null },
        { text: 'Unknown confidence', confidence: 'certain', source: null },
      ],
      genre: [' Pop ', null, '', 42],
      sources: [
        { label: ' Article ', url: ' https://example.com/article ' },
        null,
        { label: '', url: 'https://example.com/no-label' },
        { label: 'No URL' },
      ],
    });

    expect(report.summary).toBe('A concise summary.');
    expect(report.emotionalFingerprint?.arc).toEqual(['Guarded', 'Open']);
    expect(report.musicalAnalysis).toEqual({
      mood: 'Calm',
      keyElements: ['Piano'],
      soundscape: 'Wide',
    });
    expect(report.audioFeatures).toBeUndefined();
    expect(report.culturalContext?.connections).toEqual(['Artist A']);
    expect(report.credits).toEqual([
      { name: 'Producer', role: 'Production', knownFor: 'Other song' },
    ]);
    expect(report.findings).toEqual([
      {
        text: 'Verified detail',
        confidence: 'verified',
        source: { label: 'Source', url: 'https://example.com/report' },
      },
    ]);
    expect(report.genre).toEqual(['Pop']);
    expect(report.sources).toEqual([
      { label: 'Article', url: 'https://example.com/article' },
    ]);
  });

  test.each([
    ['summary', { summary: 42 }],
    ['emotional fingerprint', { emotionalFingerprint: { arc: 'bad' } }],
    ['musical analysis', { musicalAnalysis: { keyElements: 'bad' } }],
    ['sonic fingerprint', { sonicRead: 42, audioFeatures: { source: 'spotify' } }],
    ['cultural context', { culturalContext: { connections: 'bad' } }],
    ['credits', { credits: [null, { name: '', role: '' }] }],
    ['findings', { findings: [null, { text: 'x', confidence: 'unknown' }] }],
    ['genre', { genre: [null, '', 42] }],
    ['sources', { sources: [null, { label: '', url: '' }] }],
  ])('omits a malformed %s section', (_label, input) => {
    const report = normalizeSongInfo(input);

    expect(hasSongInfoContent(report)).toBe(false);
  });
});
