-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "firstPaymentAmount" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "Settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "billingDay" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
