/*
  Warnings:

  - You are about to drop the column `roomId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the `Room` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_roomId_fkey";

-- DropForeignKey
ALTER TABLE "Room" DROP CONSTRAINT "Room_hotelId_fkey";

-- DropForeignKey
ALTER TABLE "Room" DROP CONSTRAINT "Room_roomTypeId_fkey";

-- DropIndex
DROP INDEX "Booking_roomId_checkInDate_checkOutDate_idx";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "roomId";

-- DropTable
DROP TABLE "Room";

-- CreateTable
CREATE TABLE "RoomTypeInventory" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "totalRooms" INTEGER NOT NULL,
    "bookedRooms" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "RoomTypeInventory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomTypeInventory_roomTypeId_idx" ON "RoomTypeInventory"("roomTypeId");

-- CreateIndex
CREATE INDEX "RoomTypeInventory_date_idx" ON "RoomTypeInventory"("date");

-- CreateIndex
CREATE UNIQUE INDEX "RoomTypeInventory_date_roomTypeId_key" ON "RoomTypeInventory"("date", "roomTypeId");

-- CreateIndex
CREATE INDEX "Booking_checkInDate_checkOutDate_idx" ON "Booking"("checkInDate", "checkOutDate");

-- AddForeignKey
ALTER TABLE "RoomTypeInventory" ADD CONSTRAINT "RoomTypeInventory_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "RoomType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
