import { data } from "react-router";
import type { Route } from "./+types/proof-image";
import { prisma } from "@/lib/prisma.server";
import { requireUser } from "@/lib/auth/session.server";
import { canSeeProof } from "@/lib/proofs.server";

/** The uploaded screenshot, for the teacher and the family it belongs to. */
export async function loader({ request, params }: Route.LoaderArgs) {
  const session = await requireUser(request);
  const proof = await prisma.paymentProof.findUnique({
    where: { id: params.id },
    select: { studentIds: true, image: true, imageType: true },
  });
  if (!proof?.image || !(await canSeeProof(session, proof))) throw data("Not found", { status: 404 });

  return new Response(new Uint8Array(proof.image), {
    headers: {
      "Content-Type": proof.imageType ?? "image/jpeg",
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
