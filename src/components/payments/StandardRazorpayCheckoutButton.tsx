'use client';

import { useState, useEffect, type CSSProperties } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary';

export interface StandardRazorpayCheckoutButtonProps {
  userEmail: string;
  /** Amount in paise (minimum 100). */
  amountPaise?: number;
  description?: string;
  label?: string;
  className?: string;
  style?: CSSProperties;
  variant?: ButtonVariant;
  onVerified?: () => void;
}

export function StandardRazorpayCheckoutButton({
  userEmail,
  amountPaise = 10_000,
  description = 'Standard checkout (test order)',
  label = 'Pay with Razorpay (standard)',
  className,
  style,
  variant = 'outline',
  onVerified,
}: StandardRazorpayCheckoutButtonProps) {
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
    if (!scriptLoaded || amountPaise < 100) return;
    setLoading(true);

    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountPaise, currency: 'INR' }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        alert(data.error ?? 'Failed to create order. Please try again.');
        return;
      }

      const data = (await res.json()) as {
        order_id: string;
        amount: number;
        currency: string;
        key: string;
      };

      const rzp = new window.Razorpay({
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: 'InterviewEra',
        description,
        prefill: { email: userEmail },
        theme: { color: '#4F46E5' },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          const verifyRes = await fetch('/api/verify-payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            }),
          });

          const verifyJson = (await verifyRes.json()) as { ok?: boolean; error?: string };

          if (!verifyRes.ok || !verifyJson.ok) {
            alert(verifyJson.error ?? 'Payment verification failed. Do not treat this as paid.');
            return;
          }

          alert('Payment verified successfully.');
          onVerified?.();
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
          },
        },
      });

      rzp.on('payment.failed', (failResponse) => {
        const msg = failResponse.error?.description ?? 'Payment failed. Please try another method.';
        alert(msg);
        setLoading(false);
      });

      rzp.open();
    } catch (err) {
      console.error('[standard-checkout]', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      className={cn('w-full sm:w-auto', className)}
      style={style}
      variant={variant}
      onClick={handleCheckout}
      disabled={loading || !scriptLoaded || amountPaise < 100}
    >
      {loading ? 'Opening checkout…' : label}
    </Button>
  );
}
