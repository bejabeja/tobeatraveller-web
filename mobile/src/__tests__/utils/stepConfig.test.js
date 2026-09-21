import { getStepConfig, STEP_CONFIG } from '../../utils/stepConfig';

describe('getStepConfig', () => {
  it('returns the matching config for a known category', () => {
    expect(getStepConfig('accommodation')).toBe(STEP_CONFIG.accommodation);
  });

  it('falls back to "other" for an unknown category', () => {
    expect(getStepConfig('not-a-real-category')).toBe(STEP_CONFIG.other);
  });

  it('falls back to "other" when category is undefined', () => {
    expect(getStepConfig(undefined)).toBe(STEP_CONFIG.other);
  });
});
