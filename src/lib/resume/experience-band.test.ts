import { describe, expect, it } from 'vitest';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';
import {
  isInternshipExperienceEntry,
  refineExperienceEstimate,
} from '@/lib/resume/experience-band';

describe('experience-band internship rules', () => {
  it('detects internship / trainee titles', () => {
    expect(
      isInternshipExperienceEntry({
        title: 'Software Engineering Intern',
        organization: 'Acme',
        date_range: 'Jun 2024 – Aug 2024',
        bullets: [],
      }),
    ).toBe(true);
    expect(
      isInternshipExperienceEntry({
        title: 'Founder & Full-Stack Developer',
        organization: 'InterviewEra.com',
        date_range: 'Apr 2026 – Present',
        bullets: [],
      }),
    ).toBe(false);
  });

  it('forces 0-1 years when experience is exclusively internships', () => {
    expect(
      refineExperienceEstimate('1-3 years', [
        {
          title: 'Backend Intern',
          organization: 'Startup A',
          date_range: '2023',
          bullets: ['Built APIs'],
        },
        {
          title: 'Trainee Developer',
          organization: 'Startup B',
          date_range: '2024',
          bullets: ['Fixed bugs'],
        },
      ]),
    ).toBe('0-1 years');
  });

  it('keeps estimate when a professional role is present', () => {
    expect(
      refineExperienceEstimate('0-1 years', [
        {
          title: 'Founder & Full-Stack Developer',
          organization: 'InterviewEra.com',
          date_range: 'Apr 2026 – Present',
          bullets: ['Shipped product'],
        },
        {
          title: 'Summer Intern',
          organization: 'Acme',
          date_range: '2024',
          bullets: [],
        },
      ]),
    ).toBe('0-1 years');
  });

  it('coerceParsedResume applies internship clamp after LLM over-band', () => {
    const profile = coerceParsedResume({
      target_role: 'Software Engineer',
      skills: ['Python', 'FastAPI'],
      experience_estimate: '1-3 years',
      experience: [
        {
          title: 'Software Development Intern',
          organization: 'TechCorp',
          date_range: 'Jan 2024 – Jun 2024',
          bullets: ['Worked on APIs'],
        },
        {
          title: 'Web Development Intern',
          organization: 'WebCo',
          date_range: 'Jul 2024 – Dec 2024',
          bullets: ['React UI'],
        },
      ],
    });
    expect(profile.experience_estimate).toBe('0-1 years');
  });
});
