'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Mail, MessageSquare, Send, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  IE_ALERT_BANNER_CLASS,
  IE_ALERT_SUCCESS_STYLE,
  IE_FIELD_GROUP_CLASS,
  IE_FIELD_SURFACE_STYLE,
  IE_HELPER_TEXT_CLASS,
  IE_INPUT_TOOL_CLASS,
  IE_LABEL_CLASS,
  IE_MARKETING_SURFACE_CARD_CLASS,
  IE_SPINNER_CLASS,
  IE_SUBMIT_BUTTON_CLASS,
  IE_SUBMIT_BUTTON_STYLE,
  IE_TEXTAREA_TOOL_CLASS,
  IE_UPLOAD_ICON_SHELL_CLASS,
  IE_UPLOAD_ICON_SHELL_STYLE,
} from '@/lib/theme/component-classes';
import { cn } from '@/lib/utils';

type FormState = 'idle' | 'submitting' | 'sent';

/** Matches `contactFormSchema` message max — keep in sync with validations/contact.ts */
const MESSAGE_MAX_LENGTH = 4000;

const PLACEHOLDERS = {
  name: 'Your Name',
  email: 'e.g. you@gmail.com — we reply to this address',
  message:
    'Tell us what you need — billing, login, interview bug, or feedback. Include your account email if different from above.',
} as const;

function FieldLabel({
  htmlFor,
  icon: Icon,
  children,
}: {
  htmlFor: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className={cn(IE_LABEL_CLASS, 'flex items-center gap-2')}>
      <Icon className="size-4 shrink-0 text-[var(--accent-primary)]" aria-hidden />
      {children}
    </label>
  );
}

export function ContactForm() {
  const [formState, setFormState] = useState<FormState>('idle');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (formState === 'submitting') return;

    setFormState('submitting');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? 'Could not send your message.');
        setFormState('idle');
        return;
      }
      toast.success('Message sent — we will reply within one business day.');
      setName('');
      setEmail('');
      setMessage('');
      setFormState('sent');
    } catch {
      toast.error('Network error. Please try again.');
      setFormState('idle');
    }
  }

  const messageLength = message.length;
  const messageCountColor =
    messageLength >= MESSAGE_MAX_LENGTH
      ? 'var(--accent-danger)'
      : messageLength >= MESSAGE_MAX_LENGTH - 200
        ? 'var(--accent-warning)'
        : 'var(--text-muted)';

  const cardStyle = {
    borderColor: 'var(--card-border)',
    background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
    boxShadow:
      'var(--card-shadow), 0 12px 40px -8px rgba(0,0,0,.22), 0 0 48px color-mix(in srgb, var(--accent-primary) 6%, transparent)',
  } as const;

  return (
    <div
      className={cn(IE_MARKETING_SURFACE_CARD_CLASS, 'flex h-full w-full flex-col overflow-hidden')}
      style={cardStyle}
    >
      <div
        className="border-b px-6 py-5 sm:px-8"
        style={{
          borderColor: 'var(--card-border)',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 10%, transparent), transparent)',
        }}
      >
        <div className="flex items-center gap-3">
          <span className={cn(IE_UPLOAD_ICON_SHELL_CLASS, 'size-11 rounded-2xl')} style={IE_UPLOAD_ICON_SHELL_STYLE}>
            <Send className="size-5" aria-hidden />
          </span>
          <div>
            <h2
              className="font-[family-name:var(--font-bricolage)] text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: 'var(--text-primary)' }}
            >
              Send us a message
            </h2>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              We&apos;ll reply to the email you provide below.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-5 px-6 py-6 sm:px-8 sm:py-7">
        {formState === 'sent' && (
          <div
            className={cn(IE_ALERT_BANNER_CLASS, 'flex items-start gap-2.5')}
            style={IE_ALERT_SUCCESS_STYLE}
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="mt-0.5 size-4 shrink-0" style={{ color: 'var(--accent-success)' }} aria-hidden />
            <p>
              <strong>Message sent.</strong> We&apos;ll reply within one business day. You can send another message below if needed.
            </p>
          </div>
        )}

        <div className={IE_FIELD_GROUP_CLASS}>
          <FieldLabel htmlFor="contact-name" icon={User}>
            Name
          </FieldLabel>
          <input
            id="contact-name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={formState === 'submitting'}
            placeholder={PLACEHOLDERS.name}
            className={IE_INPUT_TOOL_CLASS}
            style={IE_FIELD_SURFACE_STYLE}
          />
        </div>

        <div className={IE_FIELD_GROUP_CLASS}>
          <FieldLabel htmlFor="contact-email" icon={Mail}>
            Email
          </FieldLabel>
          <input
            id="contact-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={formState === 'submitting'}
            placeholder={PLACEHOLDERS.email}
            className={IE_INPUT_TOOL_CLASS}
            style={IE_FIELD_SURFACE_STYLE}
          />
        </div>

        <div className={cn(IE_FIELD_GROUP_CLASS, 'flex min-h-0 flex-1 flex-col')}>
          <FieldLabel htmlFor="contact-message" icon={MessageSquare}>
            Message
          </FieldLabel>
          <textarea
            id="contact-message"
            required
            maxLength={MESSAGE_MAX_LENGTH}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={formState === 'submitting'}
            placeholder={PLACEHOLDERS.message}
            aria-describedby="contact-message-hint contact-message-count"
            className={cn(
              IE_TEXTAREA_TOOL_CLASS,
              'min-h-[11rem] flex-1 resize-none overflow-y-auto sm:min-h-[13rem] lg:min-h-[18rem]',
            )}
            style={IE_FIELD_SURFACE_STYLE}
          />
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <p id="contact-message-hint" className={IE_HELPER_TEXT_CLASS}>
              Minimum 10 characters. Include order ID or interview link if relevant.
            </p>
            <p
              id="contact-message-count"
              className={cn(IE_HELPER_TEXT_CLASS, 'ml-auto shrink-0 tabular-nums')}
              style={{ color: messageCountColor }}
              aria-live="polite"
            >
              {messageLength.toLocaleString('en-IN')} / {MESSAGE_MAX_LENGTH.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={formState === 'submitting'}
          className={cn(IE_SUBMIT_BUTTON_CLASS, 'mt-auto shrink-0')}
          style={IE_SUBMIT_BUTTON_STYLE}
        >
          {formState === 'submitting' ? (
            <>
              <Loader2 className={IE_SPINNER_CLASS} aria-hidden />
              Sending…
            </>
          ) : formState === 'sent' ? (
            <>
              <Send className="size-4" aria-hidden />
              Send another message
            </>
          ) : (
            <>
              <Send className="size-4" aria-hidden />
              Send message
            </>
          )}
        </button>
      </form>
    </div>
  );
}
