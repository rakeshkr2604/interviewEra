'use client';

import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { PAID_PLANS } from '@/lib/pricing/plans';
import {
  checkoutOrderDescription,
  PAYMENT_ALREADY_PROCESSED_MESSAGE,
  PAYMENT_CANCELLED_MESSAGE,
  PAYMENT_FAILED_USER_MESSAGE,
  PAYMENT_NETWORK_ERROR_MESSAGE,
  PAYMENT_ORDER_FAILED_MESSAGE,
  PAYMENT_VERIFY_FAILED_USER_MESSAGE,
} from '@/lib/pricing/copy';
import { loadRazorpayScript } from '@/lib/pricing/razorpay-script';
import { RenewPlanConfirmDialog } from '@/components/pricing/RenewPlanConfirmDialog';
import { trackLandingCtaClicked } from '@/lib/analytics/cta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import {
  trackPaymentCompletedGa4Backup,
  trackPaymentStartedOnce,
  trackPlanSelected,
} from '@/lib/analytics/funnel-ga4-bridge';

interface RazorpayOrderCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name: string;
  description: string;
  prefill: { email: string };
  theme: { color: string };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  modal: { ondismiss: () => void };
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOrderCheckoutOptions) => {
      open: () => void;
      on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary';

interface CheckoutButtonProps {
  userEmail: string;
  plan: 'starter' | 'pro';
  label: string;
  /** Analytics source for payment_started / payment_completed (e.g. upgrade, pricing). */
  source?: string;
  /** Optional campaign / promo code (server validates; never trust client amount). */
  promoCode?: string;
  campaignCodeId?: string;
  /** True when extending an active paid plan (shows confirm modal). */
  isRenewal?: boolean;
  planExpiresAt?: string | null;
  className?: string;
  style?: CSSProperties;
  variant?: ButtonVariant;
}

function mapCreateOrderError(status: number, error?: string): string {
  if (status === 429) return error ?? 'Too many attempts. Please wait a moment and try again.';
  if (status === 409) return error ?? 'You already have an active plan at this tier or higher.';
  if (status === 503) return error ?? PAYMENT_ORDER_FAILED_MESSAGE;
  return error ?? PAYMENT_ORDER_FAILED_MESSAGE;
}

async function verifyPaymentOnServer(params: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{
  ok: boolean;
  error?: string;
  plan?: 'starter' | 'pro';
  planExpiresAt?: string;
  activated?: boolean;
  alreadyActivated?: boolean;
}> {
  let res: Response;
  try {
    res = await fetch('/api/payments/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch {
    return { ok: false, error: PAYMENT_NETWORK_ERROR_MESSAGE };
  }

  const json = (await res.json()) as {
    ok?: boolean;
    error?: string;
    plan?: 'starter' | 'pro';
    planExpiresAt?: string;
    activated?: boolean;
    alreadyActivated?: boolean;
    activationFailed?: boolean;
  };

  if (!res.ok || !json.ok) {
    if (res.status >= 500) {
      return { ok: false, error: PAYMENT_VERIFY_FAILED_USER_MESSAGE };
    }
    return { ok: false, error: json.error ?? PAYMENT_VERIFY_FAILED_USER_MESSAGE };
  }

  return {
    ok: true,
    plan: json.plan,
    planExpiresAt: json.planExpiresAt,
    activated: json.activated,
    alreadyActivated: json.alreadyActivated,
  };
}

export function CheckoutButton({
  userEmail,
  plan,
  label,
  source = 'upgrade',
  promoCode,
  campaignCodeId,
  isRenewal = false,
  planExpiresAt,
  className,
  style,
  variant = 'default',
}: CheckoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [renewDialogOpen, setRenewDialogOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadRazorpayScript()
      .then(() => {
        if (!cancelled) setScriptReady(true);
      })
      .catch(() => {
        if (!cancelled) setScriptReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openCheckout = useCallback(async () => {
    if (!scriptReady || loading) return;

    trackLandingCtaClicked({
      ctaKey: CTA_KEYS.UPGRADE_CTA,
      ctaText: label,
      section: 'upgrade_grid',
      authenticated: true,
    });

    setLoading(true);

    try {
      let res: Response;
      try {
        const body: { plan: string; code?: string } = { plan };
        const trimmed = promoCode?.trim();
        if (trimmed) body.code = trimmed.toUpperCase();
        res = await fetch('/api/payments/create-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch {
        toast.error(PAYMENT_NETWORK_ERROR_MESSAGE);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(mapCreateOrderError(res.status, data.error));
        setLoading(false);
        return;
      }

      const data = (await res.json()) as {
        order_id: string;
        amount: number;
        currency: string;
        key: string;
        plan: 'starter' | 'pro';
      };

      let userId: string | undefined;
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userId = user?.id;
      } catch {
        /* best-effort */
      }

      console.info('[payment:checkout] opening', { plan: data.plan, orderId: data.order_id });

      let dismissed = false;

      const rzp = new window.Razorpay({
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: 'InterviewEra',
        description: checkoutOrderDescription(data.plan),
        prefill: { email: userEmail },
        theme: { color: '#4F46E5' },
        handler: async (response) => {
          setLoading(true);
          const verify = await verifyPaymentOnServer({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });

          if (!verify.ok) {
            // Verify failed after Razorpay success is rare; do not release —
            // webhook/activate may still consume. User support path if stuck.
            toast.error(verify.error ?? PAYMENT_VERIFY_FAILED_USER_MESSAGE);
            setLoading(false);
            return;
          }

          if (verify.alreadyActivated) {
            toast.success(PAYMENT_ALREADY_PROCESSED_MESSAGE);
          }

          trackPaymentCompletedGa4Backup({
            paymentId: response.razorpay_payment_id,
            userId,
            plan: data.plan,
            amount: data.amount,
            source: 'checkout_success_handler',
          });

          const credits = PAID_PLANS[data.plan].credits;
          const params = new URLSearchParams({ upgraded: data.plan, credits: String(credits) });
          if (verify.planExpiresAt) {
            params.set('expires', verify.planExpiresAt);
          }
          router.push(`/dashboard?${params.toString()}`);
          router.refresh();
        },
        modal: {
          ondismiss: () => {
            dismissed = true;
            setLoading(false);
            toast.message(PAYMENT_CANCELLED_MESSAGE);
          },
        },
      });

      rzp.on('payment.failed', (failResponse) => {
        const msg = failResponse.error?.description ?? PAYMENT_FAILED_USER_MESSAGE;
        console.error('[payment:checkout] payment.failed', msg);
        toast.error(msg);
        setLoading(false);
      });

      rzp.open();
      trackPaymentStartedOnce({
        orderId: data.order_id,
        userId,
        plan: data.plan,
        amount: data.amount,
        source,
        campaignCodeId,
      });
      if (!dismissed) {
        setLoading(false);
      }
    } catch (err) {
      console.error('[payment:checkout]', err);
      toast.error(PAYMENT_ORDER_FAILED_MESSAGE);
      setLoading(false);
    }
  }, [
    scriptReady,
    loading,
    label,
    plan,
    userEmail,
    source,
    promoCode,
    campaignCodeId,
    router,
  ]);

  function handleClick() {
    trackPlanSelected({
      plan,
      sourcePage: '/upgrade',
      source: 'pricing_grid',
      campaignCode: promoCode,
      campaignCodeId,
    });
    if (isRenewal && planExpiresAt) {
      setRenewDialogOpen(true);
      return;
    }
    void openCheckout();
  }

  const checkoutAriaLabel = loading
    ? 'Opening payment checkout'
    : `${label} — pay via Razorpay`;

  return (
    <>
      <Button
        className={cn('w-full min-h-12', className)}
        style={style}
        variant={variant}
        onClick={handleClick}
        disabled={loading || !scriptReady}
        aria-label={checkoutAriaLabel}
      >
        {loading ? 'Opening checkout…' : !scriptReady ? 'Loading checkout…' : label}
      </Button>

      {isRenewal && planExpiresAt ? (
        <RenewPlanConfirmDialog
          open={renewDialogOpen}
          onOpenChange={setRenewDialogOpen}
          planExpiresAt={planExpiresAt}
          loading={loading}
          onConfirm={() => {
            setRenewDialogOpen(false);
            void openCheckout();
          }}
        />
      ) : null}
    </>
  );
}
