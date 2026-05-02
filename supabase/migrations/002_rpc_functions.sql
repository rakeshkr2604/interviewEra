-- InterviewEra — RPC Functions Migration
-- Atomic credit management to prevent race conditions

-- Atomically deducts 1 credit. Returns success + remaining count.
-- Uses UPDATE...WHERE credits_remaining > 0 which is atomic in PostgreSQL.
CREATE OR REPLACE FUNCTION deduct_credit(p_user_id UUID)
RETURNS TABLE (success BOOLEAN, remaining INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_remaining INTEGER;
BEGIN
  UPDATE users
  SET credits_remaining = credits_remaining - 1
  WHERE id = p_user_id AND credits_remaining > 0
  RETURNING credits_remaining INTO v_remaining;

  IF v_remaining IS NOT NULL THEN
    INSERT INTO credit_transactions (user_id, type, amount, reason)
    VALUES (p_user_id, 'debit', 1, 'interview_start');
    RETURN QUERY SELECT TRUE, v_remaining;
  ELSE
    RETURN QUERY SELECT FALSE, 0;
  END IF;
END;
$$;

-- Adds credits and logs the transaction (used for referral bonuses, manual grants)
CREATE OR REPLACE FUNCTION add_credit(p_user_id UUID, p_amount INTEGER, p_reason TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET credits_remaining = credits_remaining + p_amount
  WHERE id = p_user_id;

  INSERT INTO credit_transactions (user_id, type, amount, reason)
  VALUES (p_user_id, 'credit', p_amount, p_reason);
END;
$$;

-- Refunds 1 credit (called when interview start fails after deduction)
CREATE OR REPLACE FUNCTION refund_credit(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE users
  SET credits_remaining = credits_remaining + 1
  WHERE id = p_user_id;

  INSERT INTO credit_transactions (user_id, type, amount, reason)
  VALUES (p_user_id, 'credit', 1, 'interview_start_failed_refund');
END;
$$;
