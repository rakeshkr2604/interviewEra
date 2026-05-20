import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import {
  initializeConversationState,
  updateConversationState,
  getConversationState,
} from '@/lib/interview/conversation-state';
import type { ConversationTurn, InterviewContext } from '@/lib/interview/types';

/**
 * Verify the authenticated user owns the given interview.
 * Service client is used for the lookup, but the user_id filter enforces ownership.
 */
async function userOwnsInterview(userId: string, interviewId: string): Promise<boolean> {
  const service = createServiceClient();
  const { data } = await service
    .from('interviews')
    .select('id')
    .eq('id', interviewId)
    .eq('user_id', userId)
    .maybeSingle();
  return Boolean(data);
}

/** Resolve a conversation_state id to its owning interview_id (or null). */
async function interviewIdForState(stateId: string): Promise<string | null> {
  const service = createServiceClient();
  const { data } = await service
    .from('conversation_states')
    .select('interview_id')
    .eq('id', stateId)
    .maybeSingle();
  return (data?.interview_id as string | undefined) ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const {
      action,
      interview_id,
      context,
      turn,
    } = (body ?? {}) as {
      action?: string;
      interview_id?: string;
      context?: InterviewContext;
      turn?: ConversationTurn & { conversation_state_id?: string };
    };

    if (action === 'initialize') {
      if (!interview_id || !context) {
        return NextResponse.json({ error: 'interview_id and context required' }, { status: 400 });
      }
      if (!(await userOwnsInterview(user.id, interview_id))) {
        return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
      }
      const state = await initializeConversationState(interview_id, context);
      return NextResponse.json({ state });
    }

    if (action === 'update') {
      const stateId = turn?.conversation_state_id;
      if (!stateId || !turn) {
        return NextResponse.json(
          { error: 'turn with conversation_state_id required' },
          { status: 400 },
        );
      }
      const ownedInterview = await interviewIdForState(stateId);
      if (!ownedInterview || !(await userOwnsInterview(user.id, ownedInterview))) {
        return NextResponse.json({ error: 'Conversation state not found' }, { status: 404 });
      }
      const state = await updateConversationState(stateId, turn);
      return NextResponse.json({ state });
    }

    if (action === 'get') {
      if (!interview_id) {
        return NextResponse.json({ error: 'interview_id required' }, { status: 400 });
      }
      if (!(await userOwnsInterview(user.id, interview_id))) {
        return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
      }
      const state = await getConversationState(interview_id);
      return NextResponse.json({ state });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[conversation-api]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
