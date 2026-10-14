'use client'

import { useId, useRef, useState, type FormEvent } from 'react'
import { FreeToolFormCard } from '@/components/landing/FreeToolFormCard'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useClientReady } from '@/components/prep/use-client-ready'
import { copyText } from '@/lib/prep/copy-text'
import { trackPrepEvent } from '@/lib/prep/analytics'
import { recordPromptBuilderRun } from '@/app/(marketing)/tools/prompt-builder/actions'
import {
  buildInterviewPrepPrompt,
  CANDIDATE_LEVEL_LABELS,
  CANDIDATE_LEVELS,
  PREP_GOAL_LABELS,
  PREP_GOALS,
  PROMPT_FIELD_LIMITS,
  promptOptionalFlags,
  validatePromptBuilder,
  type CandidateLevel,
  type PrepGoal,
  type PromptBuilderInput,
  type PromptValidationError,
} from '@/lib/prep/prompt-builder'
import {
  IE_FIELD_ERROR_CLASS,
  IE_FIELD_GROUP_CLASS,
  IE_FIELD_SURFACE_STYLE,
  IE_HELPER_TEXT_CLASS,
  IE_INPUT_TOOL_CLASS,
  IE_LABEL_CLASS,
  IE_LABEL_OPTIONAL_CLASS,
  IE_MARKETING_CTA_SECONDARY_CLASS,
  IE_MARKETING_CTA_SECONDARY_STYLE,
  IE_SELECT_TOOL_CLASS,
  IE_SUBMIT_BUTTON_CLASS,
  IE_SUBMIT_BUTTON_STYLE,
  IE_TEXTAREA_TOOL_CLASS,
} from '@/lib/theme/component-classes'

const INITIAL: PromptBuilderInput = {
  targetRole: '',
  targetCompany: '',
  candidateLevel: 'fresher',
  skills: '',
  jobDescription: '',
  resumeText: '',
  goal: 'comprehensive',
}

export function PromptBuilder() {
  const baseId = useId()
  const roleRef = useRef<HTMLInputElement>(null)
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const [values, setValues] = useState<PromptBuilderInput>(INITIAL)
  const [error, setError] = useState<PromptValidationError | null>(null)
  const [prompt, setPrompt] = useState<string | null>(null)
  const [editingInputs, setEditingInputs] = useState(true)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const ready = useClientReady()

  function update<K extends keyof PromptBuilderInput>(key: K, value: PromptBuilderInput[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setError((current) => (current?.field === key ? null : current))
  }

  function generatePrompt() {
    const result = validatePromptBuilder(values)
    if (!result.ok) {
      setError(result)
      setCopyStatus('idle')
      roleRef.current?.focus()
      return
    }
    const nextPrompt = buildInterviewPrepPrompt(result.value)
    setPrompt(nextPrompt)
    setError(null)
    setCopyStatus('idle')
    setEditingInputs(false)
    const flags = promptOptionalFlags(result.value)
    trackPrepEvent('prep_prompt_generated', {
      goal: result.value.goal,
      level: result.value.candidateLevel,
      ...flags,
    })
    void recordPromptBuilderRun({ goal: result.value.goal }).catch(() => {})
    requestAnimationFrame(() => {
      promptRef.current?.focus()
    })
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    generatePrompt()
  }

  function onReset() {
    setValues(INITIAL)
    setPrompt(null)
    setError(null)
    setCopyStatus('idle')
    setEditingInputs(true)
    roleRef.current?.focus()
  }

  async function onCopy() {
    if (!prompt) return
    const result = await copyText(prompt)
    setCopyStatus(result === 'copied' ? 'copied' : 'failed')
    trackPrepEvent('prep_prompt_copied', { outcome: result === 'copied' ? 'success' : 'failed' })
    if (result !== 'copied') {
      promptRef.current?.focus()
      promptRef.current?.select()
    }
  }

  const roleError = error?.field === 'targetRole' ? error.message : null
  const companyError = error?.field === 'targetCompany' ? error.message : null
  const skillsError = error?.field === 'skills' ? error.message : null
  const jdError = error?.field === 'jobDescription' ? error.message : null
  const resumeError = error?.field === 'resumeText' ? error.message : null

  return (
    <FreeToolFormCard
      headerEyebrow="On this device"
      headerTitle="ChatGPT interview preparation prompt"
      headerSubtitle="Generates a prompt you paste into your own ChatGPT chat. InterviewEra does not send this form to an AI provider."
    >
      <form className="space-y-6 px-4 py-5 sm:px-7 sm:py-6" data-ready={ready ? 'true' : 'false'} onSubmit={onSubmit} noValidate>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          The builder writes the prompt locally in your browser. It does not upload your resume to InterviewEra,
          and it does not save what you type in this form.
        </p>

        {editingInputs ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className={`${IE_FIELD_GROUP_CLASS} sm:col-span-2`}>
              <label className={IE_LABEL_CLASS} htmlFor={`${baseId}-role`}>
                Target job role
              </label>
              <Input
                ref={roleRef}
                id={`${baseId}-role`}
                name="targetRole"
                autoComplete="organization-title"
                maxLength={PROMPT_FIELD_LIMITS.targetRole}
                value={values.targetRole}
                onChange={(event) => update('targetRole', event.target.value)}
                aria-required="true"
                aria-invalid={roleError ? true : undefined}
                aria-describedby={roleError ? `${baseId}-role-error` : undefined}
                placeholder="Backend intern, Java developer, data analyst"
                className={IE_INPUT_TOOL_CLASS}
                style={IE_FIELD_SURFACE_STYLE}
              />
              {roleError ? (
                <p id={`${baseId}-role-error`} className={IE_FIELD_ERROR_CLASS} role="alert">
                  {roleError}
                </p>
              ) : null}
            </div>

            <div className={IE_FIELD_GROUP_CLASS}>
              <label className={IE_LABEL_CLASS} htmlFor={`${baseId}-company`}>
                Target company <span className={IE_LABEL_OPTIONAL_CLASS}>(optional)</span>
              </label>
              <Input
                id={`${baseId}-company`}
                name="targetCompany"
                autoComplete="organization"
                maxLength={PROMPT_FIELD_LIMITS.targetCompany}
                value={values.targetCompany}
                onChange={(event) => update('targetCompany', event.target.value)}
                aria-invalid={companyError ? true : undefined}
                aria-describedby={companyError ? `${baseId}-company-error` : undefined}
                placeholder="Leave blank if you are preparing for the role in general"
                className={IE_INPUT_TOOL_CLASS}
                style={IE_FIELD_SURFACE_STYLE}
              />
              {companyError ? (
                <p id={`${baseId}-company-error`} className={IE_FIELD_ERROR_CLASS} role="alert">
                  {companyError}
                </p>
              ) : null}
            </div>

            <div className={IE_FIELD_GROUP_CLASS}>
              <label className={IE_LABEL_CLASS} htmlFor={`${baseId}-level`}>
                Candidate level
              </label>
              <select
                id={`${baseId}-level`}
                name="candidateLevel"
                className={IE_SELECT_TOOL_CLASS}
                style={IE_FIELD_SURFACE_STYLE}
                value={values.candidateLevel}
                onChange={(event) => update('candidateLevel', event.target.value as CandidateLevel)}
              >
                {CANDIDATE_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {CANDIDATE_LEVEL_LABELS[level]}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${IE_FIELD_GROUP_CLASS} sm:col-span-2`}>
              <label className={IE_LABEL_CLASS} htmlFor={`${baseId}-goal`}>
                Primary preparation goal
              </label>
              <select
                id={`${baseId}-goal`}
                name="goal"
                className={IE_SELECT_TOOL_CLASS}
                style={IE_FIELD_SURFACE_STYLE}
                value={values.goal}
                onChange={(event) => update('goal', event.target.value as PrepGoal)}
              >
                {PREP_GOALS.map((goal) => (
                  <option key={goal} value={goal}>
                    {PREP_GOAL_LABELS[goal]}
                  </option>
                ))}
              </select>
            </div>

            <div className={`${IE_FIELD_GROUP_CLASS} sm:col-span-2`}>
              <label className={IE_LABEL_CLASS} htmlFor={`${baseId}-skills`}>
                Key skills or technologies <span className={IE_LABEL_OPTIONAL_CLASS}>(optional)</span>
              </label>
              <Input
                id={`${baseId}-skills`}
                name="skills"
                maxLength={PROMPT_FIELD_LIMITS.skills}
                value={values.skills}
                onChange={(event) => update('skills', event.target.value)}
                aria-invalid={skillsError ? true : undefined}
                aria-describedby={skillsError ? `${baseId}-skills-error` : undefined}
                placeholder="Only skills you can discuss, separated by commas"
                className={IE_INPUT_TOOL_CLASS}
                style={IE_FIELD_SURFACE_STYLE}
              />
              {skillsError ? (
                <p id={`${baseId}-skills-error`} className={IE_FIELD_ERROR_CLASS} role="alert">
                  {skillsError}
                </p>
              ) : null}
            </div>

            <div className={`${IE_FIELD_GROUP_CLASS} sm:col-span-2`}>
              <label className={IE_LABEL_CLASS} htmlFor={`${baseId}-jd`}>
                Job description <span className={IE_LABEL_OPTIONAL_CLASS}>(optional)</span>
              </label>
              <Textarea
                id={`${baseId}-jd`}
                name="jobDescription"
                maxLength={PROMPT_FIELD_LIMITS.jobDescription}
                value={values.jobDescription}
                onChange={(event) => update('jobDescription', event.target.value)}
                aria-invalid={jdError ? true : undefined}
                aria-describedby={jdError ? `${baseId}-jd-error` : undefined}
                placeholder="Paste the parts of the posting you are preparing for"
                className={IE_TEXTAREA_TOOL_CLASS}
                style={IE_FIELD_SURFACE_STYLE}
              />
              {jdError ? (
                <p id={`${baseId}-jd-error`} className={IE_FIELD_ERROR_CLASS} role="alert">
                  {jdError}
                </p>
              ) : null}
            </div>

            <div className={`${IE_FIELD_GROUP_CLASS} sm:col-span-2`}>
              <label className={IE_LABEL_CLASS} htmlFor={`${baseId}-resume`}>
                Resume text <span className={IE_LABEL_OPTIONAL_CLASS}>(optional)</span>
              </label>
              <Textarea
                id={`${baseId}-resume`}
                name="resumeText"
                maxLength={PROMPT_FIELD_LIMITS.resumeText}
                value={values.resumeText}
                onChange={(event) => update('resumeText', event.target.value)}
                aria-invalid={resumeError ? true : undefined}
                aria-describedby={`${baseId}-resume-help`}
                placeholder="You can leave this empty. If you paste text, paste only what you are willing to put into ChatGPT."
                className={`${IE_TEXTAREA_TOOL_CLASS} max-h-80 min-w-0`}
                style={IE_FIELD_SURFACE_STYLE}
              />
              <p id={`${baseId}-resume-help`} className={IE_HELPER_TEXT_CLASS}>
                {resumeError ??
                  'This stays in the page until you reset or leave. It is not stored by InterviewEra and is not sent to our servers.'}
              </p>
            </div>
          </div>
        ) : (
          <div
            className="rounded-[var(--ie-radius-md)] border px-4 py-3 text-sm leading-relaxed"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
          >
            <p>
              Prompt for <strong style={{ color: 'var(--text-primary)' }}>{values.targetRole}</strong>
              {' · '}
              {CANDIDATE_LEVEL_LABELS[values.candidateLevel]}
              {' · '}
              {PREP_GOAL_LABELS[values.goal]}
            </p>
            <p className="mt-1">
              {values.resumeText.trim()
                ? 'Your resume text is included in the prompt below. Edit the prompt or your inputs before you copy it.'
                : 'No resume text was included. You can still edit the prompt, or add a resume and generate again.'}
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button type="button" onClick={generatePrompt} className={`${IE_SUBMIT_BUTTON_CLASS} sm:w-auto`} style={IE_SUBMIT_BUTTON_STYLE}>
            Generate prompt
          </button>
          {prompt ? (
            <button
              type="button"
              className={IE_MARKETING_CTA_SECONDARY_CLASS}
              style={IE_MARKETING_CTA_SECONDARY_STYLE}
              onClick={() => {
                setEditingInputs(true)
                requestAnimationFrame(() => roleRef.current?.focus())
              }}
            >
              Edit inputs
            </button>
          ) : null}
          <button
            type="button"
            className={IE_MARKETING_CTA_SECONDARY_CLASS}
            style={IE_MARKETING_CTA_SECONDARY_STYLE}
            onClick={onReset}
          >
            Reset
          </button>
        </div>

        {prompt ? (
          <div className={IE_FIELD_GROUP_CLASS}>
            <label className={IE_LABEL_CLASS} htmlFor={`${baseId}-prompt`}>
              Generated prompt
            </label>
            <p className={IE_HELPER_TEXT_CLASS}>
              Paste this into your own ChatGPT conversation. You can edit it here before copying. InterviewEra does not
              send it anywhere.
            </p>
            <Textarea
              ref={promptRef}
              id={`${baseId}-prompt`}
              name="generatedPrompt"
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value)
                setCopyStatus('idle')
              }}
              className={`${IE_TEXTAREA_TOOL_CLASS} min-h-72 max-h-[32rem] min-w-0 font-mono text-xs leading-relaxed sm:text-sm`}
              style={IE_FIELD_SURFACE_STYLE}
              spellCheck={false}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                className={IE_MARKETING_CTA_SECONDARY_CLASS}
                style={IE_MARKETING_CTA_SECONDARY_STYLE}
                onClick={() => {
                  void onCopy()
                }}
              >
                Copy prompt
              </button>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }} role="status" aria-live="polite">
                {copyStatus === 'copied' ? 'Copied. Paste it into your own ChatGPT chat.' : null}
                {copyStatus === 'failed'
                  ? 'Copy failed. The prompt is selected so you can copy it manually.'
                  : null}
              </p>
            </div>
          </div>
        ) : null}
      </form>
    </FreeToolFormCard>
  )
}
