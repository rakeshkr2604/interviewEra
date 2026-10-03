import * as React from 'react';
import { render as renderEmail } from '@react-email/render';

// Import templates
import WelcomeEmail from '../../../emails/WelcomeEmail';
import VerificationEmail from '../../../emails/VerificationEmail';
import ResetPasswordEmail from '../../../emails/ResetPasswordEmail';
import InterviewCompletedEmail from '../../../emails/InterviewCompletedEmail';
import InterviewRecoveryEmail from '../../../emails/InterviewRecoveryEmail';
import WeeklyProgressEmail from '../../../emails/WeeklyProgressEmail';
import ProductUpdateEmail from '../../../emails/ProductUpdateEmail';

export interface TemplateDefinition {
  name: string;
  subject: string | ((props: Record<string, unknown>) => string);
  component: React.ComponentType;
}

export class TemplateRegistry {
  private registry = new Map<string, TemplateDefinition>();

  constructor() {
    this.register('welcome', {
      name: 'welcome',
      subject: 'Welcome to InterviewEra!',
      component: WelcomeEmail as React.ComponentType,
    });
    this.register('verification', {
      name: 'verification',
      subject: 'Verify your email address',
      component: VerificationEmail as React.ComponentType,
    });
    this.register('reset_password', {
      name: 'reset_password',
      subject: 'Reset your InterviewEra password',
      component: ResetPasswordEmail as React.ComponentType,
    });
    this.register('interview_completed', {
      name: 'interview_completed',
      subject: (props: Record<string, unknown>) => `Mock Interview Completed: Score ${props.overallScore || 0}/100`,
      component: InterviewCompletedEmail as React.ComponentType,
    });
    this.register('interview_recovery', {
      name: 'interview_recovery',
      subject: (props: Record<string, unknown>) => {
        const role =
          typeof props.roleLabel === 'string' && props.roleLabel.trim()
            ? props.roleLabel.trim()
            : 'your mock interview';
        return `Resume your unfinished interview (${role})`;
      },
      component: InterviewRecoveryEmail as React.ComponentType,
    });
    this.register('weekly_progress', {
      name: 'weekly_progress',
      subject: 'Your InterviewEra Weekly Progress Report',
      component: WeeklyProgressEmail as React.ComponentType,
    });
    this.register('product_update', {
      name: 'product_update',
      subject: 'InterviewEra just got better — your account has been updated',
      component: ProductUpdateEmail as React.ComponentType,
    });
  }

  register(name: string, definition: TemplateDefinition) {
    this.registry.set(name, definition);
  }

  get(name: string): TemplateDefinition | undefined {
    return this.registry.get(name);
  }

  async render(name: string, props: Record<string, unknown>): Promise<{ html: string; subject: string }> {
    const definition = this.get(name);
    if (!definition) {
      throw new Error(`Template '${name}' is not registered`);
    }

    const element = React.createElement(definition.component as React.ComponentType<Record<string, unknown>>, props);
    const html = `<!DOCTYPE html>${await renderEmail(element)}`;
    const subject = typeof definition.subject === 'function'
      ? definition.subject(props)
      : definition.subject;

    return { html, subject };
  }
}
export const templateRegistry = new TemplateRegistry();
