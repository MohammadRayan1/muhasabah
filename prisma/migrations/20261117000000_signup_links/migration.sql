-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "pendingApproval" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SignupLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "label" TEXT,
    "programIds" TEXT[],
    "price" DOUBLE PRECISION NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "familyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignupLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SignupLink_token_key" ON "SignupLink"("token");

