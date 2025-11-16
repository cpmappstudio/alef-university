import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();
/**
 * Webhook endpoint for Clerk user events.
 * Configure Clerk -> Webhooks -> + Add Endpoint with
 * https://<deployment>.convex.site/clerk-users-webhook and subscribe to user.* events.
 */
http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (!event) {
      return new Response("Invalid Clerk webhook", { status: 400 });
    }

    switch (event.type) {
      case "user.created":
      case "user.updated": {
        if (!hasEmailPayload(event.data)) {
          console.warn(
            `[clerk-webhook] Skipping ${event.type} for ${event.data?.id ?? "unknown"} – no email in payload`,
          );
          break;
        }

        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: event.data,
        });
        break;
      }
      case "user.deleted": {
        const clerkUserId = event.data.id;
        if (clerkUserId) {
          await ctx.runMutation(internal.users.deleteFromClerk, {
            clerkUserId,
          });
        }
        break;
      }
      default:
        console.log(`Ignored Clerk webhook event: ${event.type}`);
    }

    return new Response(null, { status: 200 });
  }),
});

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  const payload = await req.text();

  const svixHeaders = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  if (
    !svixHeaders["svix-id"] ||
    !svixHeaders["svix-timestamp"] ||
    !svixHeaders["svix-signature"]
  ) {
    console.error("Missing Svix headers on Clerk webhook");
    return null;
  }

  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("Missing CLERK_WEBHOOK_SECRET environment variable");
    return null;
  }

  const wh = new Webhook(secret);
  try {
    return wh.verify(payload, svixHeaders) as unknown as WebhookEvent;
  } catch (error) {
    console.error("Error verifying Clerk webhook", error);
    return null;
  }
}

function hasEmailPayload(data: WebhookEvent["data"]): boolean {
  const payload = data as {
    email_addresses?: Array<{ email_address?: string | null }>;
  };
  return Array.isArray(payload?.email_addresses)
    ? payload.email_addresses.some(
        (address) =>
          typeof address?.email_address === "string" &&
          address.email_address.length > 0,
      )
    : false;
}

export default http;

