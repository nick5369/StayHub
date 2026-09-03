-- Drop the old constraint
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS booking_no_overlap;

-- Re-add the constraint with tsrange and [)
ALTER TABLE "Booking" ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (
    "roomId" WITH =,
    tsrange("checkInDate", "checkOutDate", '[)') WITH &&
  ) WHERE (status NOT IN ('cancelled', 'refunded'));