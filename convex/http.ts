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
 * 3. Subscribe to: user.created event
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

        switch (event.type) {
            case "user.created":
                const emailAddress = event.data.email_addresses?.[0]?.email_address;

                if (!emailAddress) {
                    console.error("No email address in webhook payload");
                    break;
                }

                console.log("Processing user.created for email:", emailAddress);

                try {
                    // Find the pending user
                    const pendingUser = await ctx.runQuery(internal.auth.getUserByEmailInternal, {
                        email: emailAddress
                    });

                    console.log("Pending user found:", !!pendingUser);

                    if (pendingUser && pendingUser.clerkId.startsWith("pending_")) {
                        // Get firstName and lastName from metadata or from Clerk payload
                        const firstName = event.data.public_metadata?.firstName ||
                            event.data.first_name ||
                            pendingUser.firstName;
                        const lastName = event.data.public_metadata?.lastName ||
                            event.data.last_name ||
                            pendingUser.lastName;

                        console.log("Activating user with names:", firstName, lastName);

                        // Activate the user with real Clerk ID
                        await ctx.runMutation(internal.auth.activatePendingUserInternal, {
                            userId: pendingUser._id,
                            clerkId: event.data.id,
                        });

                        console.log("User activated successfully");

                        // Update Clerk user with firstName and lastName
                        const clerkAPIKey = process.env.CLERK_SECRET_KEY;
                        if (clerkAPIKey) {
                            try {
                                await fetch(`https://api.clerk.com/v1/users/${event.data.id}`, {
                                    method: "PATCH",
                                    headers: {
                                        "Authorization": `Bearer ${clerkAPIKey}`,
                                        "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                        first_name: firstName,
                                        last_name: lastName,
                                    }),
                                });
                                console.log("Clerk user updated with names");
                            } catch (error) {
                                console.error("Failed to update Clerk user with names:", error);
                            }
                        }
                    } else {
                        console.log("No pending user found or user already activated");
                    }
                } catch (error) {
                    console.error("Error processing user.created webhook:", error);
                    return new Response("Error processing webhook", { status: 500 });
                }
                break;

            default:
                console.log("Ignored Clerk webhook event", event.type);
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