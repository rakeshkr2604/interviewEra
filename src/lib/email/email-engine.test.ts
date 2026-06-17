import { describe, it, expect } from 'vitest';
import { getRetryDelaySeconds } from './queue';
import { generateSignedUrl, verifySignature, injectOpenTracker, rewriteLinks } from './tracking';
import { templateRegistry } from './templates';
import { generateRecommendation, generateWeakestArea, WeeklyDimensionScores } from '../../emails/utils/weeklyHelpers';

describe('Email Automation Engine Unit Tests', () => {
  describe('Queue Backoff Logic', () => {
    it('should calculate exponential retry delays correctly', () => {
      expect(getRetryDelaySeconds(0)).toBe(60);     // 1 min
      expect(getRetryDelaySeconds(1)).toBe(300);    // 5 min
      expect(getRetryDelaySeconds(2)).toBe(1800);   // 30 min
      expect(getRetryDelaySeconds(3)).toBe(21600);  // 6 hr
      expect(getRetryDelaySeconds(4)).toBe(86400);  // 24 hr
      expect(getRetryDelaySeconds(10)).toBe(86400); // capped at 24 hr
    });
  });

  describe('Tracking & Signing Utilities', () => {
    const secret = 'test-signing-secret';
    const baseUrl = 'https://api.test.com';
    const jobId = 'job-123';

    it('should generate signed click redirect URLs and verify them', () => {
      const targetUrl = 'https://interviewera.com/dashboard';
      const signedUrl = generateSignedUrl(targetUrl, jobId, secret, baseUrl);
      
      expect(signedUrl).toContain(encodeURIComponent(targetUrl));
      expect(signedUrl).toContain('sig=');
      
      const urlObj = new URL(signedUrl);
      const sig = urlObj.searchParams.get('sig') || '';
      
      expect(verifySignature(jobId, targetUrl, sig, secret)).toBe(true);
      expect(verifySignature(jobId, targetUrl, 'wrong-signature', secret)).toBe(false);
    });

    it('should inject open tracking pixel before closing body tag', () => {
      const html = '<html><body><h1>Hello</h1></body></html>';
      const result = injectOpenTracker(html, jobId, baseUrl);
      
      expect(result).toContain('/api/email/track/open?job_id=job-123');
      expect(result).toContain('</body>');
    });

    it('should rewrite anchor tag href properties to signed tracking links', () => {
      const html = '<div><a href="https://interviewera.com/practice">Practice</a></div>';
      const result = rewriteLinks(html, jobId, secret, baseUrl);
      
      expect(result).toContain('/api/email/track/click?job_id=job-123');
      expect(result).toContain('url=https%3A%2F%2Finterviewera.com%2Fpractice');
    });
  });

  describe('Template Registry Renders', () => {
    it('should lookup and render template markup with props', () => {
      const result = templateRegistry.render('welcome', {
        candidateName: 'Rakesh',
      });
      
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('Rakesh');
      expect(result.subject).toBe('Welcome to InterviewEra!');
    });
  });

  describe('Weekly Progress Helpers', () => {
    const mockDimensions: WeeklyDimensionScores = {
      communication: { current: 91, previous: 80 },
      technical: { current: 83, previous: 85 },
      confidence: { current: 89, previous: 85 },
      problemSolving: { current: 86, previous: 82 },
      structure: { current: 84, previous: 80 },
    };

    it('should identify weakest skill and suggest targets', () => {
      const weakest = generateWeakestArea(mockDimensions);
      expect(weakest.key).toBe('technical');
      expect(weakest.score).toBe(83);
    });

    it('should select technical frontend recommendation if weakest is technical and candidate role is frontend', () => {
      const recommendation = generateRecommendation(mockDimensions, 'Frontend Engineer');
      expect(recommendation.role).toBe('React Frontend Interview');
      expect(recommendation.estimatedMinutes).toBe(15);
    });
  });
});
