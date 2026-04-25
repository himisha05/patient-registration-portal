-- Add new columns as nullable first (existing rows need backfill)
ALTER TABLE "Patient"
  ADD COLUMN "date_of_birth" TIMESTAMP(3),
  ADD COLUMN "email" TEXT,
  ADD COLUMN "gender" TEXT,
  ADD COLUMN "referring_doctor" TEXT,
  ADD COLUMN "source" TEXT;

-- Legacy rows: sensible placeholders (DOB approximated from stored age)
UPDATE "Patient"
SET
  "gender" = COALESCE("gender", 'Other'),
  "source" = COALESCE("source", 'Walk-in'),
  "date_of_birth" = COALESCE("date_of_birth", (CURRENT_DATE - make_interval(years => "age")));

ALTER TABLE "Patient" ALTER COLUMN "gender" SET NOT NULL;
ALTER TABLE "Patient" ALTER COLUMN "date_of_birth" SET NOT NULL;
ALTER TABLE "Patient" ALTER COLUMN "source" SET NOT NULL;
