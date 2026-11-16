import type { Route } from "./+types/api.stripe-webhook";
import { handleStripeWebhook } from "@/lib/stripe.server";

export function action({ request }: Route.ActionArgs) {
  return handleStripeWebhook(request);
}
