'use client';

import { useState, type FormEvent } from 'react';
import { Phone } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  buildWhatsAppChatUrl,
  pricingWhatsAppCallbackMessage,
  pricingWhatsAppInterestMessage,
} from '@/lib/pricing/whatsapp-support';

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      role="img"
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.435 9.884-9.884 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
    </svg>
  );
}

function openWhatsApp(text: string) {
  const url = buildWhatsAppChatUrl(text);
  window.open(url, '_blank', 'noopener,noreferrer');
}

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  message: '',
};

export function PricingWhatsAppSupport() {
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);

  function resetAndClose() {
    setEnquiryOpen(false);
    setForm(emptyForm);
    setError(null);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.replace(/\D/g, '');
    const message = form.message.trim();

    if (name.length < 2) {
      setError('Please enter your name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email.');
      return;
    }
    if (phone.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    openWhatsApp(
      pricingWhatsAppCallbackMessage({
        name,
        email,
        phone: phone.slice(-10),
        message,
      }),
    );
    resetAndClose();
  }

  return (
    <section className="mx-auto w-full max-w-3xl" aria-labelledby="pricing-wa-title">
      <div className="ie-pricing-wa">
        <div className="ie-pricing-wa__lead">
          <span className="ie-pricing-wa__icon" aria-hidden>
            <WhatsAppGlyph className="size-4" />
          </span>
          <div className="ie-pricing-wa__copy">
            <h2 id="pricing-wa-title" className="ie-pricing-wa__title">
              Got any doubts or interested in a plan?
            </h2>
            <p className="ie-pricing-wa__body">
              We&apos;re just a message away. Unsure which plan fits, or want a quick walkthrough —
              InterviewEra support can help on WhatsApp.
            </p>
          </div>
        </div>

        <div className="ie-pricing-wa__actions">
          <button
            type="button"
            className="ie-pricing-wa__btn ie-pricing-wa__btn--primary ie-focus-visible"
            onClick={() => {
              setError(null);
              setEnquiryOpen(true);
            }}
          >
            <Phone className="size-4 shrink-0" aria-hidden />
            Request a callback
          </button>
          <a
            href={buildWhatsAppChatUrl(pricingWhatsAppInterestMessage())}
            target="_blank"
            rel="noopener noreferrer"
            className="ie-pricing-wa__btn ie-pricing-wa__btn--ghost ie-focus-visible"
          >
            <WhatsAppGlyph className="size-4 shrink-0 text-[#25D366]" />
            Message on WhatsApp
          </a>
        </div>
      </div>

      <Dialog
        open={enquiryOpen}
        onOpenChange={(open) => {
          if (!open) resetAndClose();
          else setEnquiryOpen(true);
        }}
      >
        <DialogContent
          className="ie-pricing-enquiry max-h-[min(90vh,640px)] overflow-y-auto sm:max-w-md"
          style={{
            background: 'var(--card-bg)',
            color: 'var(--text-primary)',
            borderColor: 'var(--card-border)',
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              Have a question? Request a callback
            </DialogTitle>
            <DialogDescription style={{ color: 'var(--text-secondary)' }}>
              Tell us what you need. We&apos;ll open WhatsApp with your details so InterviewEra can
              reply right away.
            </DialogDescription>
          </DialogHeader>

          <form className="mt-1 space-y-3.5" onSubmit={onSubmit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="ie-enquiry-name">Name</Label>
              <Input
                id="ie-enquiry-name"
                name="name"
                autoComplete="name"
                placeholder="Enter your name"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ie-enquiry-email">Email</Label>
              <Input
                id="ie-enquiry-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={form.email}
                onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ie-enquiry-phone">Phone number</Label>
              <div className="ie-pricing-enquiry__phone">
                <span className="ie-pricing-enquiry__cc" aria-hidden>
                  +91
                </span>
                <Input
                  id="ie-enquiry-phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  placeholder="Enter your phone number"
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      phone: e.target.value.replace(/[^\d\s]/g, '').slice(0, 12),
                    }))
                  }
                  className="border-0 bg-transparent shadow-none focus-visible:ring-0"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ie-enquiry-message">Message</Label>
              <Textarea
                id="ie-enquiry-message"
                name="message"
                rows={4}
                placeholder="Write your message / query / opinion…"
                value={form.message}
                onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
              />
            </div>

            {error ? (
              <p className="text-sm font-medium" style={{ color: 'var(--accent-danger)' }} role="alert">
                {error}
              </p>
            ) : null}

            <DialogFooter className="border-0 bg-transparent px-0 pb-0 pt-2 sm:justify-stretch">
              <DialogClose
                render={
                  <Button type="button" variant="outline" className="min-h-11 flex-1 rounded-xl" />
                }
              >
                Cancel
              </DialogClose>
              <Button
                type="submit"
                className="min-h-11 flex-1 rounded-xl text-white"
                style={{ background: 'var(--accent-primary)' }}
              >
                Submit now
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
