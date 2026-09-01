CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE "Booking" ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (
    "roomId" WITH =,
    daterange("checkInDate"::date, "checkOutDate"::date, '[]') WITH &&
  ) WHERE (status <> 'cancelled');
