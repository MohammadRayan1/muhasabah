-- Online card payments are gone; families upload proof of payment instead.
DROP INDEX IF EXISTS "Payment_stripeSessionId_key";
ALTER TABLE "Payment" DROP COLUMN "stripeSessionId",
ADD COLUMN     "proofId" TEXT;

-- CreateTable
CREATE TABLE "PaymentProof" (
    "id" TEXT NOT NULL,
    "studentIds" TEXT[],
    "amount" DOUBLE PRECISION NOT NULL,
    "paidOn" TIMESTAMP(3) NOT NULL,
    "method" TEXT NOT NULL,
    "note" TEXT,
    "image" BYTEA,
    "imageType" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "rejectReason" TEXT,
    "submittedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentProof_status_createdAt_idx" ON "PaymentProof"("status", "createdAt");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_proofId_fkey" FOREIGN KEY ("proofId") REFERENCES "PaymentProof"("id") ON DELETE SET NULL ON UPDATE CASCADE;
