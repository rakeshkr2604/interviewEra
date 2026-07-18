/**
 * Zod contract for parse-v2 LLM output.
 * Malformed / missing sections → empty arrays + sections_missing flags (no fabrication).
 */

import { z } from 'zod';

const experienceEntrySchema = z.object({
  organization: z.string().max(160).optional().default(''),
  title: z.string().max(160).optional().default(''),
  date_range: z.string().max(80).optional().default(''),
  bullets: z.array(z.string().max(280)).max(3).optional().default([]),
});

const educationEntrySchema = z.object({
  institution: z.string().max(160).optional().default(''),
  degree: z.string().max(160).optional().default(''),
  year_range: z.string().max(80).optional().default(''),
});

const projectEntrySchema = z.object({
  name: z.string().max(160).optional().default(''),
  description: z.string().max(400).optional().default(''),
  technologies: z.array(z.string().max(48)).max(12).optional().default([]),
  // Accept legacy/alternate keys from models
  title: z.string().max(160).optional(),
});

export const parsedResumeV2Schema = z.object({
  target_role: z.string().max(120).optional().default(''),
  skills: z.array(z.string().max(64)).max(12).optional().default([]),
  experience_estimate: z.string().max(48).optional().default(''),
  experience: z.array(experienceEntrySchema).max(6).optional().default([]),
  education: z.array(educationEntrySchema).max(6).optional().default([]),
  projects: z.array(projectEntrySchema).max(6).optional().default([]),
  sections_missing: z
    .object({
      experience: z.boolean().optional(),
      education: z.boolean().optional(),
      projects: z.boolean().optional(),
    })
    .optional(),
});

export type ParsedResumeV2Zod = z.infer<typeof parsedResumeV2Schema>;
