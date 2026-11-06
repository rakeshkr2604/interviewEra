import { describe, expect, it } from 'vitest';
import { formatPhoneDisplay } from './phone-format';

describe('formatPhoneDisplay', () => {
  it('inserts a space after +91 for a bare 10-digit number', () => {
    expect(formatPhoneDisplay('+919709999477')).toBe('+91 9709999477');
  });

  it('leaves an already-spaced number unchanged', () => {
    expect(formatPhoneDisplay('+91 9709999477')).toBe('+91 9709999477');
  });

  it('leaves non-+91 numbers unchanged', () => {
    expect(formatPhoneDisplay('+14155552671')).toBe('+14155552671');
    expect(formatPhoneDisplay('9709999477')).toBe('9709999477');
  });

  it('leaves empty and partial input unchanged', () => {
    expect(formatPhoneDisplay('')).toBe('');
    expect(formatPhoneDisplay('+91')).toBe('+91');
    expect(formatPhoneDisplay('+9198765')).toBe('+9198765');
  });

  it('trims surrounding whitespace', () => {
    expect(formatPhoneDisplay('  +919709999477  ')).toBe('+91 9709999477');
  });
});
