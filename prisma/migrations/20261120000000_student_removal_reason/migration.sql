-- Record when and why a student was removed, so revenue stops expecting their tuition.
ALTER TABLE "Student" ADD COLUMN "removedAt" TIMESTAMP(3),
ADD COLUMN "removedReason" TEXT;

-- Students already removed: their last update is the best guess for when.
UPDATE "Student" SET "removedAt" = "updatedAt" WHERE "active" = false AND "pendingApproval" = false;
