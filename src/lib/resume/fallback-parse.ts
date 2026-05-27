/**
 * Heuristic resume struct extraction when AI JSON parsing fails or times out.
 * Must produce interview-ready structure for typical Indian tech resumes.
 */

import type { ParsedResume, ParsedResumeEducation, ParsedResumeExperience } from '@/types/app.types';
import type { ResumeParseQuality } from '@/types/app.types';
import { sampleTextForHeuristic } from '@/lib/resume/parse-input';

const SKILL_HINTS =
  /\b(?:javascript|typescript|python|java|react|node\.?js|sql|aws|docker|kubernetes|git|html|css|c\+\+|golang|go\b|rust|mongodb|postgresql|mysql|excel|communication|leadership|spring|angular|vue|next\.?js|tensorflow|pytorch|figma)\b/gi;

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
const YEAR_RANGE_RE = /(?:19|20)\d{2}\s*[-–—]\s*(?:19|20)\d{2}|(?:19|20)\d{2}/;

function extractName(text: string): string {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean).slice(0, 12);
  for (const line of lines) {
    if (line.length < 3 || line.length > 70) continue;
    if (EMAIL_RE.test(line) || PHONE_RE.test(line) || /@|linkedin|github/i.test(line)) continue;
    if (/resume|curriculum vitae|^cv$/i.test(line)) continue;
    if (/^[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z.'-]+){1,4}$/.test(line)) return line.slice(0, 120);
  }
  const first = lines[0];
  return first && first.length <= 70 && !EMAIL_RE.test(first) ? first.slice(0, 120) : '';
}

function extractSkills(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(SKILL_HINTS)) {
    if (m[0]) found.add(m[0].toLowerCase());
  }

  const section = text.match(
    /(?:technical\s+)?skills?\s*[:\-]?\s*([\s\S]{0,800})/i,
  );
  if (section?.[1]) {
    for (const part of section[1].split(/[,;|•\n]/)) {
      const s = part.trim().replace(/^[-•*]\s*/, '');
      if (s.length >= 2 && s.length <= 48 && !/^\d+$/.test(s) && !/^(and|or)$/i.test(s)) {
        found.add(s);
      }
    }
  }

  const toolsLine = text.match(/(?:tools?|technologies)\s*[:\-]\s*([^\n]{10,300})/i);
  if (toolsLine?.[1]) {
    for (const part of toolsLine[1].split(/[,;|]/)) {
      const s = part.trim();
      if (s.length >= 2 && s.length <= 40) found.add(s);
    }
  }

  return [...found].slice(0, 24);
}

function extractExperience(text: string): ParsedResumeExperience[] {
  const experiences: ParsedResumeExperience[] = [];
  const blocks = text.split(/\n(?=[A-Z][^\n]{8,80}(?:\n|$))/);

  for (const block of blocks.slice(0, 12)) {
    const lines = block.split(/\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    const joined = lines.join(' ');
    if (!YEAR_RANGE_RE.test(joined) && !/engineer|developer|intern|analyst|manager/i.test(joined)) {
      continue;
    }

    const durationMatch = joined.match(
      /(?:19|20)\d{2}\s*[-–—]\s*(?:19|20)\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(?:19|20)\d{2}|Present|Current/i,
    );
    const duration = durationMatch?.[0]?.trim() ?? '';

    let role = lines[0] ?? '';
    let company = lines.length > 1 ? lines[1] : '';
    if (role.length > 80) role = role.slice(0, 80);
    if (company.length > 80) company = company.slice(0, 80);

    const description = lines.slice(2).join(' ').slice(0, 400);
    if (!role && !company && description.length < 30) continue;

    experiences.push({
      company: company || '—',
      role: role || 'Role',
      duration,
      description: description || joined.slice(0, 400),
    });
    if (experiences.length >= 4) break;
  }

  if (experiences.length === 0) {
    const snippet = text.slice(0, 900).replace(/\s+/g, ' ').trim();
    if (snippet.length >= 50 && /experience|intern|engineer|developer/i.test(snippet)) {
      experiences.push({
        company: '',
        role: 'Experience',
        duration: '',
        description: snippet.slice(0, 500),
      });
    }
  }

  return experiences.slice(0, 6);
}

function extractEducation(text: string): ParsedResumeEducation[] {
  const ed: ParsedResumeEducation[] = [];
  const section = text.match(/education\s*[:\-]?\s*([\s\S]{0,600})/i);
  const block = section?.[1] ?? text;

  const degreeMatch = block.match(
    /\b(B\.?\s*Tech|B\.?\s*E\.?|M\.?\s*Tech|MCA|MBA|B\.?\s*Sc\.?|M\.?\s*Sc\.?)[^.\n]*/i,
  );
  const cgpaMatch = block.match(/\b(?:CGPA|GPA)\s*[:\-]?\s*([0-9.]+(?:\s*\/\s*10)?)/i);
  const yearMatch = block.match(/(?:19|20)\d{2}/);

  if (degreeMatch) {
    ed.push({
      degree: degreeMatch[0].trim().slice(0, 120),
      institution: '',
      year: yearMatch?.[0] ?? '',
      cgpa: cgpaMatch?.[1] ?? '',
    });
  }

  const instMatch = block.match(
    /(?:at|from|,)\s*([A-Z][A-Za-z\s.&]{4,60}(?:University|Institute|College|IIT|NIT)[A-Za-z\s.&]*)/i,
  );
  if (instMatch && ed[0]) {
    ed[0].institution = instMatch[1].trim().slice(0, 120);
  }

  return ed.slice(0, 3);
}

function extractProjects(text: string): ParsedResume['projects'] {
  const projects: ParsedResume['projects'] = [];
  const section = text.match(/projects?\s*[:\-]?\s*([\s\S]{0,700})/i);
  if (!section?.[1]) return projects;

  const chunks = section[1].split(/\n(?=[•\-*]|\d+\.)/).slice(0, 5);
  for (const chunk of chunks) {
    const line = chunk.replace(/^[-•*\d.]+\s*/, '').trim();
    if (line.length < 8) continue;
    const name = line.split(/[:\-–]/)[0]?.trim().slice(0, 80) ?? 'Project';
    projects.push({
      name,
      tech_stack: [],
      description: line.slice(0, 300),
    });
  }
  return projects.slice(0, 4);
}

function inferTargetRoles(text: string, skills: string[]): string[] {
  const roles: string[] = [];
  const lower = text.toLowerCase();
  if (/software\s+engineer|developer|sde|full[\s-]?stack|backend|frontend/i.test(lower)) {
    roles.push('Software Engineer');
  }
  if (/data\s+scientist|machine\s+learning|ml\s+engineer/i.test(lower)) roles.push('Data Scientist');
  if (/product\s+manager/i.test(lower)) roles.push('Product Manager');
  if (/business\s+analyst/i.test(lower)) roles.push('Business Analyst');
  if (roles.length === 0 && skills.length > 0) roles.push('Software Engineer');
  return roles.slice(0, 4);
}

export function assessHeuristicQuality(data: ParsedResume): ResumeParseQuality {
  const signals =
    (data.name.trim() ? 1 : 0) +
    (data.skills.length >= 2 ? 1 : 0) +
    (data.experience.length > 0 ? 1 : 0) +
    (data.education.length > 0 ? 1 : 0) +
    (data.projects.length > 0 ? 1 : 0);
  if (signals >= 4) return 'full';
  if (signals >= 2) return 'degraded';
  return 'minimal';
}

export function buildFallbackParsedResume(rawText: string): {
  data: ParsedResume;
  quality: ResumeParseQuality;
} {
  const text = sampleTextForHeuristic(rawText);
  const email = text.match(EMAIL_RE)?.[0] ?? '';
  const phone = text.match(PHONE_RE)?.[0] ?? '';
  const name = extractName(text);
  const skills = extractSkills(text);
  const experience = extractExperience(text);
  const education = extractEducation(text);
  const projects = extractProjects(text);
  const target_roles = inferTargetRoles(text, skills);

  const data: ParsedResume = {
    name,
    email,
    phone,
    skills,
    experience,
    projects,
    education,
    target_roles,
  };

  const quality = assessHeuristicQuality(data);

  return {
    quality,
    data: {
      ...data,
      parse_quality: quality,
      parse_warning:
        quality === 'minimal'
          ? 'We saved your resume with limited detail — interview questions may be more general.'
          : quality === 'degraded'
            ? 'Resume saved using quick extraction — you can continue to your interview.'
            : undefined,
    },
  };
}
