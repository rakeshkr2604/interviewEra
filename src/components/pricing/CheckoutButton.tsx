'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BILLING_AMOUNTS } from '@/lib/pricing/tiers';
import {
  trackPaymentCompletedGa4Backup,
  trackPaymentStartedOnce,
} from '@/lib/analytics/funnel-ga4-bridge';

interface RazorpayOptions {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill: { email: string };
  theme: { color: string };
  handler: (response: { razorpay_payment_id: string; razorpay_subscription_id: string }) => void;
  modal: { ondismiss: () => void };
}

/** Standard (order_id) checkout — shared Window typing for CheckoutButton + StandardRazorpayCheckoutButton */
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
    Razorpay: new (options: RazorpayOptions | RazorpayOrderCheckoutOptions) => {
      open: () => void;
      on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary';

interface CheckoutButtonProps {
  userEmail: string;
  plan: 'starter' | 'pro';
  billingCycle: 'monthly' | 'annual';
  label: string;
  /** Analytics source for payment_started / payment_completed (e.g. upgrade, pricing). */
  source?: string;
  className?: string;
  style?: CSSProperties;
  variant?: ButtonVariant;
}

function resolvePlanKey(plan: 'starter' | 'pro', billingCycle: 'monthly' | 'annual'): string {
  return billingCycle === 'annual' ? `${plan}_annual` : plan;
}

function buildDescription(plan: 'starter' | 'pro', billingCycle: 'monthly' | 'annual'): string {
  const planName = plan === 'starter' ? 'Starter' : 'Pro';
  if (billingCycle === 'annual') {
    const y =
      plan === 'starter'
        ? BILLING_AMOUNTS.starter.annualTotalInr
        : BILLING_AMOUNTS.pro.annualTotalInr;
    return `${planName} Plan — ₹${y}/year`;
  }
  const m =
    plan === 'starter' ? BILLING_AMOUNTS.starter.monthlyInr : BILLING_AMOUNTS.pro.monthlyInr;
  return `${planName} Plan — ₹${m}/month`;
}

export function CheckoutButton({
  userEmail,
  plan,
  billingCycle,
  label,
  source = 'upgrade',
  className,
  style,
  variant = 'default',
}: CheckoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  async function handleCheckout() {
    if (!scriptLoaded) return;
    setLoading(true);

    try {
      const res = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billingCycle }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? 'Failed to create order. Please try again.');
        return;
      }

      const data = (await res.json()) as {
        subscriptionId: string;
        amount: number;
        currency: string;
        key: string;
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

      const planKey = resolvePlanKey(plan, billingCycle);

      trackPaymentStartedOnce({
        subscriptionId: data.subscriptionId,
        userId,
        plan: planKey,
        amount: data.amount,
        source,
      });

      const rzp = new window.Razorpay({
        key: data.key,
        subscription_id: data.subscriptionId,
        name: 'InterviewEra',
        description: buildDescription(plan, billingCycle),
        prefill: { email: userEmail },
        theme: { color: '#4F46E5' },
        handler: (response: { razorpay_payment_id: string; razorpay_subscription_id: string }) => {
          trackPaymentCompletedGa4Backup({
            paymentId: response.razorpay_payment_id,
            userId,
            plan: planKey,
            amount: data.amount,
            source: 'checkout_success_handler',
          });
          router.push(`/dashboard?upgraded=${plan}`);
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });

      rzp.open();
    } catch (err) {
      console.error('[checkout]', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      className={cn('w-full', className)}
      style={style}
      variant={variant}
      onClick={handleCheckout}
      disabled={loading || !scriptLoaded}
    >
      {loading ? 'Opening checkout…' : label}
    </Button>
  );
}
