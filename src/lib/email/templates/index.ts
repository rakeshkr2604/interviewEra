import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Import templates
import WelcomeEmail from '../../../emails/WelcomeEmail';
import VerificationEmail from '../../../emails/VerificationEmail';
import ResetPasswordEmail from '../../../emails/ResetPasswordEmail';
import InterviewCompletedEmail from '../../../emails/InterviewCompletedEmail';
import WeeklyProgressEmail from '../../../emails/WeeklyProgressEmail';

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
    this.register('weekly_progress', {
      name: 'weekly_progress',
      subject: 'Your InterviewEra Weekly Progress Report',
      component: WeeklyProgressEmail as React.ComponentType,
    });
  }

  register(name: string, definition: TemplateDefinition) {
    this.registry.set(name, definition);
  }

  get(name: string): TemplateDefinition | undefined {
    return this.registry.get(name);
  }

  render(name: string, props: Record<string, unknown>): { html: string; subject: string } {
    const definition = this.get(name);
    if (!definition) {
      throw new Error(`Template '${name}' is not registered`);
    }

    const element = React.createElement(definition.component as React.ComponentType<Record<string, unknown>>, props);
    // Include doctype wrapper standard for emails
    const html = '<!DOCTYPE html>' + renderToStaticMarkup(element);
    const subject = typeof definition.subject === 'function'
      ? definition.subject(props)
      : definition.subject;

    return { html, subject };
  }
}
export const templateRegistry = new TemplateRegistry();
