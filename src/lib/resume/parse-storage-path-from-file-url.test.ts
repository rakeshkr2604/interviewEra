import { describe, expect, it } from 'vitest';
import { parseStoragePathFromFileUrl } from './parse-storage-path-from-file-url';

const HOST = 'https://plfuvgkycmxcyshrgpgv.supabase.co';

describe('parseStoragePathFromFileUrl', () => {
  it('parses current Supabase public resume URLs', () => {
    const fileUrl = `${HOST}/storage/v1/object/public/resumes/resumes/0930b468-fda4-4864-a245-b875265b407e/1775494504487.pdf`;
    const result = parseStoragePathFromFileUrl(fileUrl);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.storagePath).toBe(
      'resumes/0930b468-fda4-4864-a245-b875265b407e/1775494504487.pdf',
    );
    expect(result.source).toBe('public');
  });

  it('parses nested folders under the resumes bucket', () => {
    const fileUrl = `${HOST}/storage/v1/object/public/resumes/resumes/user-1/archive/2024/file.pdf`;
    const result = parseStoragePathFromFileUrl(fileUrl);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.storagePath).toBe('resumes/user-1/archive/2024/file.pdf');
  });

  it('decodes percent-encoded filenames without guessing', () => {
    const fileUrl = `${HOST}/storage/v1/object/public/resumes/resumes/user-1/My%20Resume%20%282024%29.pdf`;
    const result = parseStoragePathFromFileUrl(fileUrl);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.storagePath).toBe('resumes/user-1/My Resume (2024).pdf');
  });

  it('accepts historical sign/authenticated path shapes and ignores query tokens', () => {
    const signed = `${HOST}/storage/v1/object/sign/resumes/resumes/u1/1.pdf?token=abc.def`;
    const auth = `${HOST}/storage/v1/object/authenticated/resumes/resumes/u1/1.txt`;
    const a = parseStoragePathFromFileUrl(signed);
    const b = parseStoragePathFromFileUrl(auth);
    expect(a.ok && a.storagePath).toBe('resumes/u1/1.pdf');
    expect(a.ok && a.source).toBe('sign');
    expect(b.ok && b.storagePath).toBe('resumes/u1/1.txt');
    expect(b.ok && b.source).toBe('authenticated');
  });

  it('rejects invalid URLs and empty input', () => {
    expect(parseStoragePathFromFileUrl(null).ok).toBe(false);
    expect(parseStoragePathFromFileUrl('').ok).toBe(false);
    expect(parseStoragePathFromFileUrl('not a url').ok).toBe(false);
    const bad = parseStoragePathFromFileUrl('not a url');
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.reason).toBe('invalid_url');
  });

  it('rejects wrong bucket, unsupported shapes, and traversal', () => {
    const wrongBucket = parseStoragePathFromFileUrl(
      `${HOST}/storage/v1/object/public/avatars/user/1.png`,
    );
    expect(wrongBucket.ok).toBe(false);
    if (!wrongBucket.ok) expect(wrongBucket.reason).toBe('wrong_bucket');

    const render = parseStoragePathFromFileUrl(
      `${HOST}/storage/v1/render/image/public/resumes/resumes/u/1.pdf`,
    );
    expect(render.ok).toBe(false);
    if (!render.ok) expect(render.reason).toBe('unsupported_shape');

    const traversal = parseStoragePathFromFileUrl(
      `${HOST}/storage/v1/object/public/resumes/resumes/../etc/passwd`,
    );
    expect(traversal.ok).toBe(false);
    if (!traversal.ok) expect(traversal.reason).toBe('path_traversal');
  });

  it('rejects invalid percent-encoding', () => {
    const result = parseStoragePathFromFileUrl(
      `${HOST}/storage/v1/object/public/resumes/resumes/u1/bad%GGname.pdf`,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('invalid_encoding');
  });
});
