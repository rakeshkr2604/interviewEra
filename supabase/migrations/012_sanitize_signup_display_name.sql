-- Defense in depth: normalize public.users.name when copied from auth signup metadata.

CREATE OR REPLACE FUNCTION public.sanitize_user_display_name(raw_input text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  t text;
BEGIN
  t := regexp_replace(coalesce(trim(raw_input), ''), '<[^>]*>', '', 'g');
  -- Match app-side displayNameSchema: letters, space, apostrophe, hyphen; length 2–50
  IF t ~ '^[-a-zA-Z[:space:]'']{2,50}$' THEN
    RETURN t;
  END IF;
  RETURN 'User';
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, name, plan_tier, credits_remaining)
  VALUES (
    NEW.id,
    NEW.email,
    public.sanitize_user_display_name(NEW.raw_user_meta_data->>'name'),
    'free',
    5
  );
  RETURN NEW;
END;
$$;
