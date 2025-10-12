import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

// Tipo del webhook event de Clerk
type WebhookEvent = {
    type: "user.created" | "user.updated" | "user.deleted" | string;
    data: {
        id: string;
        email_addresses?: Array<{ email_address: string }>;
        first_name?: string;
        last_name?: string;
        image_url?: string;
        public_metadata?: {
            firstName?: string;
            lastName?: string;
            [key: string]: any;
        };
        [key: string]: any;
    };
};

const http = httpRouter();

/**
 * Webhook endpoint for Clerk user events
 * This endpoint is called by Clerk whenever a user is created, updated, or deleted
 * 
 * Setup instructions:
 * 1. Go to Clerk Dashboard > Webhooks > Add Endpoint
 * 2. Set Endpoint URL to: https://<your-deployment>.convex.site/clerk-webhook
 * 3. Subscribe to: user.created, user.updated events
 * 4. Copy the Signing Secret and set it as CLERK_WEBHOOK_SECRET in Convex Dashboard
 */
http.route({
    path: "/clerk-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const event = await validateClerkWebhook(request);

        if (!event) {
            console.error("Error validating webhook");
            return new Response("Error validating webhook", { status: 400 });
        }

        console.log("Webhook event received:", event.type);

        try {
            const emailAddress = event.data.email_addresses?.[0]?.email_address;
            const firstName = event.data.first_name || "";
            const lastName = event.data.last_name || "";

            if (!emailAddress) {
                console.error("No email address in webhook payload");
                return new Response("No email address", { status: 400 });
            }

            // Llamar a la función interna que maneja el webhook
            await ctx.runMutation(internal.auth.handleClerkWebhook, {
                eventType: event.type,
                userId: event.data.id,
                email: emailAddress,
                firstName,
                lastName,
            });

            console.log(`Webhook ${event.type} processed successfully for ${emailAddress}`);
        } catch (error) {
            console.error("Error processing webhook:", error);
            return new Response("Error processing webhook", { status: 500 });
        }

        return new Response(null, { status: 200 });
    }),
});

/**
 * Validate Clerk webhook signature
 */
async function validateClerkWebhook(
    req: Request
): Promise<WebhookEvent | null> {
    const payloadString = await req.text();
    const svixHeaders = {
        "svix-id": req.headers.get("svix-id")!,
        "svix-timestamp": req.headers.get("svix-timestamp")!,
        "svix-signature": req.headers.get("svix-signature")!,
    };

    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error("CLERK_WEBHOOK_SECRET is not set");
        return null;
    }

    const wh = new Webhook(webhookSecret);

    try {
        return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
    } catch (error) {
        console.error("Error verifying webhook event", error);
        return null;
    }
}

export default http;