ALTER TABLE public.sec_member
  ADD COLUMN IF NOT EXISTS organization_inn varchar(12),
  ADD COLUMN IF NOT EXISTS gender boolean,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS email varchar(254),
  ADD COLUMN IF NOT EXISTS phone varchar(12),
  ADD COLUMN IF NOT EXISTS academic_title text;

ALTER TABLE public.sec_predsedatel_s
  ADD COLUMN IF NOT EXISTS education_diploma_series text,
  ADD COLUMN IF NOT EXISTS education_diploma_number text,
  ADD COLUMN IF NOT EXISTS education_diploma_date date,
  ADD COLUMN IF NOT EXISTS education_specialization text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sec_member_inn_format') THEN
    ALTER TABLE public.sec_member ADD CONSTRAINT sec_member_inn_format CHECK (organization_inn IS NULL OR organization_inn ~ '^[0-9]{10}([0-9]{2})?$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='sec_member_phone_format') THEN
    ALTER TABLE public.sec_member ADD CONSTRAINT sec_member_phone_format CHECK (phone IS NULL OR phone ~ '^\+7[0-9]{10}$');
  END IF;
END $$;
