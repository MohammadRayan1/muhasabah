import Link from "next/link";
import { prisma } from "@/lib/prisma";
import NewStudentForm from "@/components/NewStudentForm";

export default async function NewStudentPage() {
  const programs = await prisma.program.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <Link href="/" className="text-sm text-gray-500 hover:underline">
        ← Back to dashboard
      </Link>

      <h1 className="mt-4 mb-6 text-2xl font-semibold text-gray-900">Add Student</h1>

      <NewStudentForm programs={programs} />
    </main>
  );
}
