-- Migration: fix_schema_drift
-- Fixes drift caused by schema changes applied via db push instead of migrations.
-- Changes:
--   1. Add `numberOfRooms` column to `Booking` table
--   2. Remove `PAY_AT_HOTEL` from `PaymentMethod` enum
--   3. Remove `admin` from `UserRole` enum

-- Step 1: Add numberOfRooms to Booking (default 1 for all existing rows)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "numberOfRooms" INTEGER NOT NULL DEFAULT 1;

-- Step 2: Migrate PaymentMethod enum (remove PAY_AT_HOTEL)
-- Update any existing rows that use PAY_AT_HOTEL to STRIPE first
UPDATE "Booking" SET "paymentMethod" = 'STRIPE'::"PaymentMethod" WHERE "paymentMethod"::text = 'PAY_AT_HOTEL';

-- Recreate the enum without PAY_AT_HOTEL
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE');
ALTER TABLE "Booking" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod" USING "paymentMethod"::text::"PaymentMethod";
ALTER TABLE "Booking" ALTER COLUMN "paymentMethod" SET DEFAULT 'STRIPE';
DROP TYPE "PaymentMethod_old";

-- Step 3: Migrate UserRole enum (remove admin)
-- Update any existing rows that use admin to user first
UPDATE "User" SET "role" = 'user'::"UserRole" WHERE "role"::text = 'admin';

-- Recreate the enum without admin
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
CREATE TYPE "UserRole" AS ENUM ('user', 'hotelOwner');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole" USING "role"::text::"UserRole";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'user';
DROP TYPE "UserRole_old";
