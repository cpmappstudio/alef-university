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
        console.log("=== WEBHOOK RECEIVED ===");
        console.log("Headers:", {
            "svix-id": request.headers.get("svix-id"),
            "svix-timestamp": request.headers.get("svix-timestamp"),
            "svix-signature": request.headers.get("svix-signature")?.substring(0, 20) + "...",
        });

        const event = await validateClerkWebhook(request);

        if (!event) {
            console.error("❌ Error validating webhook signature");
            return new Response("Error validating webhook", { status: 400 });
        }

        console.log("✅ Webhook signature validated");
        console.log("Event type:", event.type);
        console.log("User ID:", event.data.id);
        console.log("Email addresses:", event.data.email_addresses);
        console.log("First name:", event.data.first_name);
        console.log("Last name:", event.data.last_name);

        try {
            const emailAddress = event.data.email_addresses?.[0]?.email_address;
            const firstName = event.data.first_name || "";
            const lastName = event.data.last_name || "";

            // Para testing de Clerk que envía email_addresses vacío
            if (!emailAddress) {
                console.warn("⚠️ No email address in webhook payload - this might be a test webhook");
                console.warn("Test webhook accepted with 200 but no action taken");
                return new Response(JSON.stringify({ 
                    message: "Test webhook received - no email to process" 
                }), { 
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                });
            }

            console.log(`Processing ${event.type} for email: ${emailAddress}`);

            // Llamar a la función interna que maneja el webhook
            const result = await ctx.runMutation(internal.auth.handleClerkWebhook, {
                eventType: event.type,
                userId: event.data.id,
                email: emailAddress,
                firstName,
                lastName,
            });

            console.log(`✅ Webhook ${event.type} processed successfully`);
            console.log("Result:", result);

            return new Response(JSON.stringify({ 
                success: true, 
                message: `${event.type} processed`,
                userId: result 
            }), { 
                status: 200,
                headers: { "Content-Type": "application/json" }
            });
        } catch (error) {
            console.error("❌ Error processing webhook:", error);
            console.error("Error details:", JSON.stringify(error, null, 2));
            return new Response(JSON.stringify({ 
                error: "Error processing webhook",
                details: error instanceof Error ? error.message : String(error)
            }), { 
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }
    }),
});

/**
 * Validate Clerk webhook signature
 */
async function validateClerkWebhook(
    req: Request
): Promise<WebhookEvent | null> {
    const payloadString = await req.text();
    
    console.log("Payload length:", payloadString.length);
    console.log("Payload preview:", payloadString.substring(0, 200));
    
    const svixHeaders = {
        "svix-id": req.headers.get("svix-id")!,
        "svix-timestamp": req.headers.get("svix-timestamp")!,
        "svix-signature": req.headers.get("svix-signature")!,
    };

    console.log("Svix headers present:", {
        hasId: !!svixHeaders["svix-id"],
        hasTimestamp: !!svixHeaders["svix-timestamp"],
        hasSignature: !!svixHeaders["svix-signature"],
    });

    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;

    if (!webhookSecret) {
        console.error("❌ CLERK_WEBHOOK_SECRET is not set in Convex environment variables");
        console.error("Go to Convex Dashboard → Settings → Environment Variables");
        console.error("Add: CLERK_WEBHOOK_SECRET=whsec_...");
        return null;
    }

    console.log("Webhook secret found (first 10 chars):", webhookSecret.substring(0, 10));

    const wh = new Webhook(webhookSecret);

    try {
        const verified = wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
        console.log("✅ Signature verified successfully");
        return verified;
    } catch (error) {
        console.error("❌ Error verifying webhook signature:", error);
        console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
        console.error("Error message:", error instanceof Error ? error.message : String(error));
        return null;
    }
}

export default http;