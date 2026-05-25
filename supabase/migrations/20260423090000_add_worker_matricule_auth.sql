ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS matricule TEXT;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_matricule_format_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_matricule_format_check
  CHECK (
    matricule IS NULL
    OR trim(matricule) = ''
    OR upper(trim(matricule)) ~ '^SCA[0-9]{4}$'
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_matricule_unique
  ON public.profiles (lower(trim(matricule)))
  WHERE matricule IS NOT NULL AND trim(matricule) <> '';

CREATE OR REPLACE FUNCTION public.get_worker_email_by_matricule(worker_matricule TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email
  FROM public.profiles
  WHERE lower(trim(matricule)) = lower(trim(worker_matricule))
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_worker_email_by_matricule(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_worker_email_by_matricule(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email, matricule)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    NULLIF(trim(COALESCE(NEW.raw_user_meta_data->>'matricule', '')), '')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user'::public.app_role);
  
  RETURN NEW;
END;
$$;
