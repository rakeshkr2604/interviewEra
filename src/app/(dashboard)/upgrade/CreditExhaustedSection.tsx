'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendChart } from '@/components/report/TrendChart';
import type { RadarDataPoint } from '@/types/app.types';

interface CreditExhaustedSectionProps {
  trendData: RadarDataPoint[];
  totalInterviewsCompleted: number;
}

/** Progress + social proof only — pricing grid is rendered separately via `PricingSection` for layout parity. */
export function CreditExhaustedSection({
  trendData,
  totalInterviewsCompleted: _totalInterviewsCompleted,
}: CreditExhaustedSectionProps) {
  return (
    <div className="space-y-6">
      {trendData.length >= 2 && (
        <div className="dashboard-premium-card">
          <Card className="gap-2 border-0 bg-transparent py-4 shadow-none ring-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                Your progress so far
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={trendData} />
            </CardContent>
          </Card>
        </div>
      )}

      <div
        className="dashboard-premium-card px-4 py-5 text-center sm:px-8"
        style={{
          borderColor: 'color-mix(in srgb, var(--accent-primary) 25%, var(--card-border))',
          background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
        }}
      >
        <p className="text-sm font-medium sm:text-base" style={{ color: 'var(--text-primary)' }}>
          Students who complete 15+ interviews score ~40% higher in real placements — keep the streak going.
        </p>
      </div>
    </div>
  );
}
