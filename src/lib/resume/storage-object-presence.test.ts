import { describe, expect, it } from 'vitest';
import { presenceFromFolderListing } from './storage-object-presence';

describe('presenceFromFolderListing', () => {
  it('marks listed filenames as verified', () => {
    expect(
      presenceFromFolderListing('1775494504487.pdf', {
        ok: true,
        names: ['1775494504487.pdf', 'other.pdf'],
      }),
    ).toBe('verified');
  });

  it('marks deleted / absent objects as missing', () => {
    expect(
      presenceFromFolderListing('1778410487968.pdf', {
        ok: true,
        names: ['1783749791037.pdf'],
      }),
    ).toBe('missing');
  });

  it('marks list failures as inaccessible', () => {
    expect(presenceFromFolderListing('a.pdf', { ok: false })).toBe('inaccessible');
  });

  it('rejects unsafe file names', () => {
    expect(
      presenceFromFolderListing('../x.pdf', { ok: true, names: ['../x.pdf'] }),
    ).toBe('inaccessible');
  });
});
