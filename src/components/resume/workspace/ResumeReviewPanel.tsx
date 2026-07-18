'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp, Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  clearResumeReviewDraft,
  createReviewDraftScheduler,
  loadResumeReviewDraft,
} from '@/lib/resume/review-draft-storage';
import { canonicalizeSkill } from '@/lib/resume/skill-canonicalize';
import type {
  ResumeEducationEntry,
  ResumeExperienceEntry,
  ResumeProjectEntry,
} from '@/types/app.types';
import type { SkillExtracted, VersionDetail } from './types';

/**
 * Confidence approach: error-prone-section flagging (not per-field confidence).
 * Role, experience band, and skills are still flagged; experience/education/projects
 * use honest empty → "add manually" (parse-v2).
 */

type SkillRow = {
  canonical: string;
  raws: string[];
};

function groupSkills(
  skillsExtracted: SkillExtracted[],
  fallbackSkills: string[],
): SkillRow[] {
  const map = new Map<string, SkillRow>();
  for (const s of skillsExtracted) {
    const key = s.canonical.toLowerCase();
    const existing = map.get(key);
    if (existing) {
      if (!existing.raws.includes(s.raw)) existing.raws.push(s.raw);
    } else {
      map.set(key, { canonical: s.canonical, raws: [s.raw] });
    }
  }
  if (map.size === 0) {
    for (const s of fallbackSkills) {
      const c = canonicalizeSkill(s) || s;
      const key = c.toLowerCase();
      if (!map.has(key)) map.set(key, { canonical: c, raws: [s] });
    }
  }
  return Array.from(map.values());
}

function PleaseVerify({ children }: { children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{
        background: 'color-mix(in srgb, var(--accent-warning, #d97706) 18%, transparent)',
        color: 'var(--accent-warning, #b45309)',
      }}
    >
      <AlertTriangle size={10} aria-hidden />
      {children}
    </span>
  );
}

const emptyExperience = (): ResumeExperienceEntry => ({
  organization: '',
  title: '',
  date_range: '',
  bullets: [''],
});

const emptyEducation = (): ResumeEducationEntry => ({
  institution: '',
  degree: '',
  year_range: '',
});

const emptyProject = (): ResumeProjectEntry => ({
  name: '',
  description: '',
  technologies: [],
});

export function ResumeReviewPanel({
  resumeId,
  version,
  onConfirmed,
  onCancel,
}: {
  resumeId: string;
  version: VersionDetail;
  onConfirmed: (result: {
    versionId: string;
    versionNumber: number;
    skipped: boolean;
  }) => void;
  onCancel?: () => void;
}) {
  const draftScheduler = useMemo(() => createReviewDraftScheduler(400), []);
  const restoredRef = useRef(false);

  const [targetRole, setTargetRole] = useState(version.parsed.target_role);
  const [experienceEstimate, setExperienceEstimate] = useState(
    version.parsed.experience_estimate,
  );
  const [skillRows, setSkillRows] = useState<SkillRow[]>(() =>
    groupSkills(version.skillsExtracted, version.parsed.skills),
  );
  const [experience, setExperience] = useState<ResumeExperienceEntry[]>(
    () => version.parsed.experience ?? [],
  );
  const [education, setEducation] = useState<ResumeEducationEntry[]>(
    () => version.parsed.education ?? [],
  );
  const [projects, setProjects] = useState<ResumeProjectEntry[]>(
    () => version.parsed.projects ?? [],
  );
  const [expandedSkill, setExpandedSkill] = useState<string | null>(null);
  const [newSkill, setNewSkill] = useState('');
  const [techDraft, setTechDraft] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const draft = loadResumeReviewDraft(resumeId, version.id);
    if (!draft) return;
    setTargetRole(draft.targetRole);
    setExperienceEstimate(draft.experienceEstimate);
    setSkillRows((prev) => {
      const kept = draft.skills.map((s) => {
        const existing = prev.find((p) => p.canonical.toLowerCase() === s.toLowerCase());
        return existing ?? { canonical: s, raws: [s] };
      });
      return kept;
    });
    if (draft.experience) setExperience(draft.experience);
    if (draft.education) setEducation(draft.education);
    if (draft.projects) setProjects(draft.projects);
    setDraftSavedAt(draft.updatedAt);
  }, [resumeId, version.id]);

  useEffect(() => {
    const draft = {
      resumeId,
      baseVersionId: version.id,
      targetRole,
      experienceEstimate,
      skills: skillRows.map((s) => s.canonical),
      removedSkills: [] as string[],
      experience,
      education,
      projects,
      updatedAt: new Date().toISOString(),
    };
    draftScheduler.schedule(draft);
    const t = setTimeout(() => setDraftSavedAt(new Date().toISOString()), 450);
    return () => {
      clearTimeout(t);
      draftScheduler.cancel();
    };
  }, [
    resumeId,
    version.id,
    targetRole,
    experienceEstimate,
    skillRows,
    experience,
    education,
    projects,
    draftScheduler,
  ]);

  const removeSkill = useCallback((canonical: string) => {
    setSkillRows((rows) => rows.filter((r) => r.canonical !== canonical));
  }, []);

  const addSkill = useCallback(() => {
    const trimmed = newSkill.trim();
    if (!trimmed) return;
    const canonical = canonicalizeSkill(trimmed) || trimmed;
    setSkillRows((rows) => {
      if (rows.some((r) => r.canonical.toLowerCase() === canonical.toLowerCase())) return rows;
      return [...rows, { canonical, raws: [trimmed] }];
    });
    setNewSkill('');
  }, [newSkill]);

  const commit = useCallback(
    async (mode: 'confirm' | 'skip') => {
      setSaving(true);
      setError(null);
      try {
        if (mode === 'skip') {
          const res = await fetch(`/api/resume/${resumeId}/verify`, {
            method: 'POST',
            credentials: 'include',
          });
          if (!res.ok) {
            const data = (await res.json().catch(() => null)) as { error?: string } | null;
            setError(data?.error ?? 'Could not verify resume.');
            return;
          }
          clearResumeReviewDraft(resumeId, version.id);
          onConfirmed({
            versionId: version.id,
            versionNumber: version.versionNumber,
            skipped: true,
          });
          return;
        }

        const cleanedExperience = experience
          .map((e) => ({
            ...e,
            bullets: e.bullets.map((b) => b.trim()).filter(Boolean).slice(0, 3),
          }))
          .filter((e) => e.organization.trim() || e.title.trim() || e.bullets.length > 0);
        const cleanedEducation = education.filter(
          (e) => e.institution.trim() || e.degree.trim() || e.year_range.trim(),
        );
        const cleanedProjects = projects
          .map((p) => ({
            ...p,
            technologies: p.technologies.map((t) => t.trim()).filter(Boolean).slice(0, 12),
          }))
          .filter((p) => p.name.trim() || p.description.trim());

        draftScheduler.flush({
          resumeId,
          baseVersionId: version.id,
          targetRole,
          experienceEstimate,
          skills: skillRows.map((s) => s.canonical),
          removedSkills: [],
          experience: cleanedExperience,
          education: cleanedEducation,
          projects: cleanedProjects,
          updatedAt: new Date().toISOString(),
        });

        const res = await fetch(`/api/resume/${resumeId}/corrections`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            baseVersionId: version.id,
            targetRole: targetRole.trim(),
            experienceEstimate: experienceEstimate.trim(),
            skills: skillRows.map((s) => s.canonical),
            experience: cleanedExperience,
            education: cleanedEducation,
            projects: cleanedProjects,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          error?: string;
          versionId?: string;
          versionNumber?: number;
        } | null;
        if (!res.ok) {
          setError(data?.error ?? 'Could not save corrections.');
          return;
        }
        clearResumeReviewDraft(resumeId, version.id);
        onConfirmed({
          versionId: data?.versionId ?? version.id,
          versionNumber: data?.versionNumber ?? version.versionNumber + 1,
          skipped: false,
        });
      } catch {
        setError('Network error while saving. Your draft is saved locally — try again.');
      } finally {
        setSaving(false);
      }
    },
    [
      draftScheduler,
      education,
      experience,
      experienceEstimate,
      onConfirmed,
      projects,
      resumeId,
      skillRows,
      targetRole,
      version.id,
      version.versionNumber,
    ],
  );

  return (
    <section
      className="dashboard-premium-card px-5 py-5 sm:px-7"
      aria-labelledby="resume-review-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id="resume-review-heading" className="dashboard-section-title">
            Review extracted details
          </h2>
          <p className="dashboard-section-subtitle">
            Confirm what we pulled from your resume. Edits save as a new version (
            <span className="font-medium">v{version.versionNumber + 1} · edited by you</span>
            ).
          </p>
        </div>
        {draftSavedAt ? (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Draft saved
          </p>
        ) : null}
      </div>

      <p
        className="mt-3 rounded-lg px-3 py-2 text-xs sm:text-sm"
        style={{
          background: 'color-mix(in srgb, var(--accent-warning, #d97706) 10%, transparent)',
          color: 'var(--text-secondary)',
        }}
      >
        Please verify highlighted sections — role, experience band, and skills are most often
        wrong. Check experience, education, and projects too; empty sections mean we couldn&apos;t
        extract them — add manually if you want interview questions grounded in that work.
      </p>

      {/* Profile basics */}
      <div className="mt-5 space-y-4">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Profile basics
          </h3>
          <PleaseVerify>please verify</PleaseVerify>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="review-role">Target role</Label>
            <Input
              id="review-role"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="min-h-11"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="review-exp">Experience band</Label>
            <Input
              id="review-exp"
              value={experienceEstimate}
              onChange={(e) => setExperienceEstimate(e.target.value)}
              className="min-h-11"
              placeholder="e.g. 1–3 years"
            />
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Skills
          </h3>
          <PleaseVerify>please verify</PleaseVerify>
        </div>
        <ul className="flex flex-wrap gap-2">
          {skillRows.map((row) => {
            const open = expandedSkill === row.canonical;
            const hasVariants =
              row.raws.length > 1 ||
              (row.raws.length === 1 &&
                row.raws[0]!.toLowerCase() !== row.canonical.toLowerCase());
            return (
              <li key={row.canonical}>
                <div
                  className="inline-flex items-center gap-1 rounded-full pl-2.5 pr-1 py-1 text-xs font-medium"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span>{row.canonical}</span>
                  {hasVariants ? (
                    <button
                      type="button"
                      className="rounded-full p-0.5"
                      aria-expanded={open}
                      aria-label={`Show raw variants for ${row.canonical}`}
                      onClick={() => setExpandedSkill(open ? null : row.canonical)}
                    >
                      {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-full p-1 hover:bg-black/5"
                    aria-label={`Remove ${row.canonical}`}
                    onClick={() => removeSkill(row.canonical)}
                  >
                    <X size={12} />
                  </button>
                </div>
                {open && hasVariants ? (
                  <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Merged from: {row.raws.join(', ')}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Input
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addSkill();
              }
            }}
            placeholder="Add a skill"
            className="min-h-11 max-w-xs"
            aria-label="Add skill"
          />
          <Button type="button" variant="outline" className="min-h-11" onClick={addSkill}>
            <Plus size={14} className="mr-1" aria-hidden />
            Add
          </Button>
        </div>
      </div>

      {/* Experience */}
      <SectionBlock
        title="Experience"
        empty={experience.length === 0}
        onAdd={() => setExperience((rows) => [...rows, emptyExperience()])}
      >
        {experience.map((entry, idx) => (
          <div key={`exp-${idx}`} className="space-y-2 rounded-lg border px-3 py-3" style={{ borderColor: 'var(--border-subtle, #e5e7eb)' }}>
            <div className="flex justify-between gap-2">
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Entry {idx + 1}
              </p>
              <button
                type="button"
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => setExperience((rows) => rows.filter((_, i) => i !== idx))}
              >
                Remove
              </button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                value={entry.title}
                onChange={(e) =>
                  setExperience((rows) =>
                    rows.map((r, i) => (i === idx ? { ...r, title: e.target.value } : r)),
                  )
                }
                placeholder="Title"
                className="min-h-10"
                aria-label={`Experience ${idx + 1} title`}
              />
              <Input
                value={entry.organization}
                onChange={(e) =>
                  setExperience((rows) =>
                    rows.map((r, i) => (i === idx ? { ...r, organization: e.target.value } : r)),
                  )
                }
                placeholder="Organization"
                className="min-h-10"
                aria-label={`Experience ${idx + 1} organization`}
              />
            </div>
            <Input
              value={entry.date_range}
              onChange={(e) =>
                setExperience((rows) =>
                  rows.map((r, i) => (i === idx ? { ...r, date_range: e.target.value } : r)),
                )
              }
              placeholder="Date range"
              className="min-h-10"
              aria-label={`Experience ${idx + 1} dates`}
            />
            {entry.bullets.map((b, bi) => (
              <Input
                key={`exp-${idx}-b-${bi}`}
                value={b}
                onChange={(e) =>
                  setExperience((rows) =>
                    rows.map((r, i) => {
                      if (i !== idx) return r;
                      const bullets = [...r.bullets];
                      bullets[bi] = e.target.value;
                      return { ...r, bullets };
                    }),
                  )
                }
                placeholder={`Bullet ${bi + 1}`}
                className="min-h-10"
                aria-label={`Experience ${idx + 1} bullet ${bi + 1}`}
              />
            ))}
            {entry.bullets.length < 3 ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  setExperience((rows) =>
                    rows.map((r, i) =>
                      i === idx ? { ...r, bullets: [...r.bullets, ''] } : r,
                    ),
                  )
                }
              >
                Add bullet
              </Button>
            ) : null}
          </div>
        ))}
      </SectionBlock>

      {/* Education */}
      <SectionBlock
        title="Education"
        empty={education.length === 0}
        onAdd={() => setEducation((rows) => [...rows, emptyEducation()])}
      >
        {education.map((entry, idx) => (
          <div key={`edu-${idx}`} className="space-y-2 rounded-lg border px-3 py-3" style={{ borderColor: 'var(--border-subtle, #e5e7eb)' }}>
            <div className="flex justify-between gap-2">
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Entry {idx + 1}
              </p>
              <button
                type="button"
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => setEducation((rows) => rows.filter((_, i) => i !== idx))}
              >
                Remove
              </button>
            </div>
            <Input
              value={entry.degree}
              onChange={(e) =>
                setEducation((rows) =>
                  rows.map((r, i) => (i === idx ? { ...r, degree: e.target.value } : r)),
                )
              }
              placeholder="Degree / program"
              className="min-h-10"
              aria-label={`Education ${idx + 1} degree`}
            />
            <Input
              value={entry.institution}
              onChange={(e) =>
                setEducation((rows) =>
                  rows.map((r, i) => (i === idx ? { ...r, institution: e.target.value } : r)),
                )
              }
              placeholder="Institution"
              className="min-h-10"
              aria-label={`Education ${idx + 1} institution`}
            />
            <Input
              value={entry.year_range}
              onChange={(e) =>
                setEducation((rows) =>
                  rows.map((r, i) => (i === idx ? { ...r, year_range: e.target.value } : r)),
                )
              }
              placeholder="Year / graduation"
              className="min-h-10"
              aria-label={`Education ${idx + 1} years`}
            />
          </div>
        ))}
      </SectionBlock>

      {/* Projects */}
      <SectionBlock
        title="Projects"
        empty={projects.length === 0}
        onAdd={() => setProjects((rows) => [...rows, emptyProject()])}
        hint="Used to personalize interview questions."
      >
        {projects.map((entry, idx) => (
          <div key={`proj-${idx}`} className="space-y-2 rounded-lg border px-3 py-3" style={{ borderColor: 'var(--border-subtle, #e5e7eb)' }}>
            <div className="flex justify-between gap-2">
              <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                Project {idx + 1}
              </p>
              <button
                type="button"
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => setProjects((rows) => rows.filter((_, i) => i !== idx))}
              >
                Remove
              </button>
            </div>
            <Input
              value={entry.name}
              onChange={(e) =>
                setProjects((rows) =>
                  rows.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)),
                )
              }
              placeholder="Project name"
              className="min-h-10"
              aria-label={`Project ${idx + 1} name`}
            />
            <Input
              value={entry.description}
              onChange={(e) =>
                setProjects((rows) =>
                  rows.map((r, i) => (i === idx ? { ...r, description: e.target.value } : r)),
                )
              }
              placeholder="Short description"
              className="min-h-10"
              aria-label={`Project ${idx + 1} description`}
            />
            <div className="flex flex-wrap gap-1.5">
              {entry.technologies.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
                  style={{
                    background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                  }}
                >
                  {t}
                  <button
                    type="button"
                    aria-label={`Remove tech ${t}`}
                    onClick={() =>
                      setProjects((rows) =>
                        rows.map((r, i) =>
                          i === idx
                            ? { ...r, technologies: r.technologies.filter((x) => x !== t) }
                            : r,
                        ),
                      )
                    }
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Input
                value={techDraft[idx] ?? ''}
                onChange={(e) => setTechDraft((d) => ({ ...d, [idx]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return;
                  e.preventDefault();
                  const t = (techDraft[idx] ?? '').trim();
                  if (!t) return;
                  setProjects((rows) =>
                    rows.map((r, i) =>
                      i === idx && !r.technologies.includes(t)
                        ? { ...r, technologies: [...r.technologies, t].slice(0, 12) }
                        : r,
                    ),
                  );
                  setTechDraft((d) => ({ ...d, [idx]: '' }));
                }}
                placeholder="Add technology"
                className="min-h-10 max-w-xs"
                aria-label={`Project ${idx + 1} add technology`}
              />
            </div>
          </div>
        ))}
      </SectionBlock>

      {error ? (
        <p className="mt-4 text-sm" role="alert" style={{ color: 'var(--accent-danger)' }}>
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {onCancel ? (
            <Button type="button" variant="ghost" className="min-h-11" disabled={saving} onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            className="min-h-11"
            disabled={saving}
            onClick={() => void commit('skip')}
          >
            Skip review — use as is
          </Button>
        </div>
        <Button
          type="button"
          className="min-h-11"
          disabled={saving || !targetRole.trim()}
          onClick={() => void commit('confirm')}
        >
          {saving ? (
            <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
          ) : (
            <Check className="mr-1.5 size-4" aria-hidden />
          )}
          Confirm all
        </Button>
      </div>
    </section>
  );
}

function SectionBlock({
  title,
  empty,
  onAdd,
  hint,
  children,
}: {
  title: string;
  empty: boolean;
  onAdd: () => void;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h3>
        {hint ? (
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {hint}
          </span>
        ) : null}
      </div>
      {empty ? (
        <div
          className="rounded-lg border border-dashed px-3 py-4 text-xs"
          style={{
            borderColor: 'var(--border-subtle, color-mix(in srgb, var(--text-muted) 25%, transparent))',
            color: 'var(--text-muted)',
          }}
        >
          <p>Not extracted — add manually if you want this used in interview questions.</p>
          <Button type="button" variant="outline" size="sm" className="mt-2 min-h-9" onClick={onAdd}>
            <Plus size={14} className="mr-1" aria-hidden />
            Add manually
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {children}
          <Button type="button" variant="outline" size="sm" className="min-h-9" onClick={onAdd}>
            <Plus size={14} className="mr-1" aria-hidden />
            Add another
          </Button>
        </div>
      )}
    </div>
  );
}
