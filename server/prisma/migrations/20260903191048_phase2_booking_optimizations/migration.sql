/*
  Warnings:

  - The `paymentMethod` column on the `Booking` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PAY_AT_HOTEL', 'STRIPE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BookingStatus" ADD VALUE 'payment_pending';
ALTER TYPE "BookingStatus" ADD VALUE 'refunded';

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "stripePaymentIntent" TEXT,
ADD COLUMN     "stripeSessionId" TEXT,
DROP COLUMN "paymentMethod",
ADD COLUMN     "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'PAY_AT_HOTEL';
