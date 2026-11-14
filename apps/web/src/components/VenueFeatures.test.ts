import { describe, expect, it } from 'vitest';
import { displayFeatureState } from './VenueFeatures';
describe('displayFeatureState', () => {
  it('aplică pragurile și declarațiile', () => {
    for (const [percent, expected] of [[69, 'Împărțit'], [70, 'Da'], [30, 'Nu'], [31, 'Împărțit']] as const)
      expect(displayFeatureState({ key: 'wifi', label: 'Wi-Fi', state: 'community', percent, text: '' })).toBe(expected);
    expect(displayFeatureState({ key: 'wifi', label: 'Wi-Fi', state: 'owner', owner: 'yes', text: '' })).toBe('Da');
    expect(displayFeatureState({ key: 'wifi', label: 'Wi-Fi', state: 'owner', owner: 'no', text: '' })).toBe('Nu');
    expect(displayFeatureState({ key: 'wifi', label: 'Wi-Fi', state: 'unknown', text: '' })).toBe('Nespecificat');
  });
});
