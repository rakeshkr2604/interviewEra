import type { ParsedResume } from '@/types/app.types';
import { safeText } from '@/lib/utils/sanitize';

const MAX = {
  name: 200,
  email: 320,
  phone: 64,
  skill: 120,
  company: 200,
  role: 200,
  duration: 64,
  description: 4000,
  projectName: 200,
  tech: 80,
  projectDesc: 4000,
  degree: 200,
  institution: 200,
  year: 32,
  cgpa: 32,
  targetRole: 200,
} as const;

export function sanitizeParsedResume(input: ParsedResume): ParsedResume {
  return {
    name: safeText(input.name, MAX.name),
    email: safeText(input.email, MAX.email),
    phone: safeText(input.phone, MAX.phone),
    skills: input.skills.map((s) => safeText(s, MAX.skill)),
    experience: input.experience.map((e) => ({
      company: safeText(e.company, MAX.company),
      role: safeText(e.role, MAX.role),
      duration: safeText(e.duration, MAX.duration),
      description: safeText(e.description, MAX.description),
    })),
    projects: input.projects.map((p) => ({
      name: safeText(p.name, MAX.projectName),
      tech_stack: p.tech_stack.map((t) => safeText(t, MAX.tech)),
      description: safeText(p.description, MAX.projectDesc),
    })),
    education: input.education.map((ed) => ({
      degree: safeText(ed.degree, MAX.degree),
      institution: safeText(ed.institution, MAX.institution),
      year: safeText(ed.year, MAX.year),
      cgpa: safeText(ed.cgpa, MAX.cgpa),
    })),
    target_roles: input.target_roles.map((r) => safeText(r, MAX.targetRole)),
  };
}
