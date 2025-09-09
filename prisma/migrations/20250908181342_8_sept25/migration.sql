/*
  Warnings:

  - Added the required column `drop_lat` to the `rides` table without a default value. This is not possible if the table is not empty.
  - Added the required column `drop_lng` to the `rides` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pickup_lat` to the `rides` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pickup_lng` to the `rides` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "rides" DROP CONSTRAINT "rides_captain_id_fkey";

-- AlterTable
ALTER TABLE "rides" ADD COLUMN     "drop_lat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "drop_lng" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "ended_at" TIMESTAMP(3),
ADD COLUMN     "pickup_lat" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "pickup_lng" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "started_at" TIMESTAMP(3),
ALTER COLUMN "status" SET DEFAULT 'requested',
ALTER COLUMN "fare" SET DEFAULT 0,
ALTER COLUMN "captain_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "captains" (
    "captain_id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "vehicle_number" TEXT NOT NULL,
    "license_number" TEXT NOT NULL,
    "current_status" TEXT NOT NULL DEFAULT 'available',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "captains_pkey" PRIMARY KEY ("captain_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "captains_phone_number_key" ON "captains"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "captains_email_key" ON "captains"("email");

-- AddForeignKey
ALTER TABLE "rides" ADD CONSTRAINT "rides_captain_id_fkey" FOREIGN KEY ("captain_id") REFERENCES "captains"("captain_id") ON DELETE SET NULL ON UPDATE CASCADE;
