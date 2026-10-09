import { describe, expect, it } from 'vitest';
import { buildListUnsubscribeHeaders } from './list-unsubscribe';

describe('buildListUnsubscribeHeaders', () => {
  it('wraps the signed URL for List-Unsubscribe and sets One-Click POST', () => {
    const url =
      'https://interviewera.com/api/email/unsubscribe?userId=u1&token=abc';
    expect(buildListUnsubscribeHeaders(url)).toEqual({
      'List-Unsubscribe': `<${url}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    });
  });

  it('rejects empty URLs', () => {
    expect(() => buildListUnsubscribeHeaders('  ')).toThrow(/required/i);
  });
});
