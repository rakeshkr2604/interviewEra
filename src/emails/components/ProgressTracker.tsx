import * as React from 'react';

export interface ProgressStep {
  label: string;
  completed: boolean;
  active?: boolean;
  icon?: string;
}

interface ProgressTrackerProps {
  currentStep?: 'signup' | 'welcome' | 'resume_uploaded' | 'interview_completed';
  steps?: ProgressStep[];
}

export function ProgressTracker({ currentStep, steps }: ProgressTrackerProps) {
  let resolvedSteps: ProgressStep[] = [];

  if (steps) {
    resolvedSteps = steps;
  } else if (currentStep) {
    switch (currentStep) {
      case 'signup':
        resolvedSteps = [
          { label: 'Account Created', completed: true },
          { label: 'Verify Email', completed: false, active: true },
          { label: 'Upload Resume', completed: false },
          { label: 'Start Interview', completed: false },
        ];
        break;
      case 'welcome':
        resolvedSteps = [
          { label: 'Account Created', completed: true },
          { label: 'Upload Resume', completed: false, active: true },
          { label: 'Start Mock Interview', completed: false },
          { label: 'View AI Report', completed: false },
        ];
        break;
      case 'resume_uploaded':
        resolvedSteps = [
          { label: 'Account Created', completed: true },
          { label: 'Resume Uploaded', completed: true },
          { label: 'Start Mock Interview', completed: false, active: true },
          { label: 'View AI Report', completed: false },
        ];
        break;
      case 'interview_completed':
        resolvedSteps = [
          { label: 'Account Created', completed: true },
          { label: 'Resume Uploaded', completed: true },
          { label: 'Mock Interview Completed', completed: true },
          { label: 'View Detailed Report', completed: false, active: true },
        ];
        break;
      default:
        resolvedSteps = [];
    }
  }

  return (
    <div
      style={{
        padding: '20px 24px',
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #f3f4f6',
        margin: '24px 0',
      }}
      className="progress-tracker"
    >
      <div style={{ paddingLeft: '8px' }}>
        {resolvedSteps.map((step, idx) => {
          let icon = step.icon || '⚪';
          let color = '#9ca3af'; // muted gray
          let fontWeight = '400';
          let className = 'pending';

          if (step.completed) {
            if (!step.icon) icon = '🟢';
            color = '#10b981'; // green
            fontWeight = '500';
            className = 'completed';
          } else if (step.active) {
            if (!step.icon) icon = '🟣';
            color = '#5B21F4'; // brand purple
            fontWeight = '600';
            className = 'active';
          }

          let subtext = '○ Next Goal';
          let subtextColor = '#9ca3af';

          if (step.completed) {
            subtext = '✓ Mastered';
            subtextColor = '#10b981';
          } else if (step.active) {
            subtext = '⬤ Working On';
            subtextColor = '#5B21F4';
          }

          return (
            <React.Fragment key={idx}>
              {/* Step */}
              <div
                style={{
                  display: 'block',
                  fontSize: '14px',
                  lineHeight: '20px',
                  color: color,
                  fontWeight: fontWeight,
                }}
                className={`progress-step ${className}`}
              >
                <table border={0} cellPadding={0} cellSpacing={0}>
                  <tr>
                    <td valign="top" style={{ paddingRight: '12px', fontSize: '15px', lineHeight: '20px' }}>
                      {icon}
                    </td>
                    <td valign="top">
                      <p style={{ margin: 0, fontSize: '14px', fontWeight: fontWeight, color: color, lineHeight: '20px' }}>
                        {step.label}
                      </p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11px', fontWeight: '700', color: subtextColor, lineHeight: '14px' }}>
                        {subtext}
                      </p>
                    </td>
                  </tr>
                </table>
              </div>
              {/* Connector line */}
              {idx < resolvedSteps.length - 1 && (
                <div
                  style={{
                    height: '24px',
                    marginLeft: '6px',
                    borderLeft: `2px solid ${step.completed ? '#10b981' : '#e5e7eb'}`,
                    marginTop: '4px',
                    marginBottom: '4px',
                  }}
                  className={`progress-connector ${step.completed ? 'completed' : 'pending'}`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
