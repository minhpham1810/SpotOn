import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import type { EmotionalFingerprint } from '../../types/song-info';
import EmotionalFingerprintCard from './EmotionalFingerprintCard';

const validFingerprint: EmotionalFingerprint = {
  arc: ['Opening', 'Rising', 'Release'],
  signatureMove: 'A sudden lift.',
  reachForThisWhen: 'The night opens up.',
};

describe('EmotionalFingerprintCard', () => {
  test.each([
    ['an empty journey', { ...validFingerprint, arc: [] }],
    [
      'a journey without meaningful string beats',
      { ...validFingerprint, arc: ['  ', 42, null] as unknown as string[] },
    ],
    ['a blank signature move', { ...validFingerprint, signatureMove: '   ' }],
    ['a non-string signature move', { ...validFingerprint, signatureMove: 42 as unknown as string }],
    ['a blank reach-for-this context', { ...validFingerprint, reachForThisWhen: '\t' }],
  ])('renders nothing for %s', (_case, emotionalFingerprint) => {
    const { container } = render(
      <EmotionalFingerprintCard emotionalFingerprint={emotionalFingerprint} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  test('sanitizes mixed journey data while preserving valid beat order and arbitrary length', () => {
    render(
      <EmotionalFingerprintCard
        emotionalFingerprint={{
          arc: [
            '  Opening  ',
            '',
            42,
            'Rising',
            null,
            'Release',
            '  Afterglow  ',
          ] as unknown as string[],
          signatureMove: '  A sudden lift.  ',
          reachForThisWhen: '  The night opens up.  ',
        }}
      />
    );

    expect(screen.getByText('A sudden lift.')).toBeInTheDocument();
    expect(screen.getByText('The night opens up.')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Emotional journey' })).toBeInTheDocument();
    expect(screen.getAllByTestId('journey-step').map((step) => step.textContent)).toEqual([
      '01Opening',
      '02Rising',
      '03Release',
      '04Afterglow',
    ]);
  });
});
