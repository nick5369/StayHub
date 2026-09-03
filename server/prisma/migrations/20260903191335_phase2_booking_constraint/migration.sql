-- Drop the old constraint
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS booking_no_overlap;

-- Re-add the constraint with the new WHERE clause
ALTER TABLE "Booking" ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (
    "roomId" WITH =,
    daterange("checkInDate"::date, "checkOutDate"::date, '[]') WITH &&
  ) WHERE (status NOT IN ('cancelled', 'refunded'));