import 'server-only';

import * as React from 'react';
import { render as renderEmail } from '@react-email/render';
import { templateRegistry } from './index';

export async function renderEmailTemplate(
  name: string,
  props: Record<string, unknown>,
): Promise<{ html: string; subject: string }> {
  const definition = templateRegistry.get(name);
  if (!definition) {
    throw new Error(`Template '${name}' is not registered`);
  }

  const element = React.createElement(
    definition.component as React.ComponentType<Record<string, unknown>>,
    props,
  );
  const html = `<!DOCTYPE html>${await renderEmail(element)}`;
  const subject =
    typeof definition.subject === 'function' ? definition.subject(props) : definition.subject;

  return { html, subject };
}
