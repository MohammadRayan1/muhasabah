-- AlterTable
ALTER TABLE "Program" ADD COLUMN     "daysPerWeek" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "dayOptions" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "daysPerWeek" INTEGER;

-- AlterTable
ALTER TABLE "SignupLink" ALTER COLUMN "price" DROP NOT NULL;
