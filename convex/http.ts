import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

http.route({
    path: "/clerk-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const payload = await request.json();

        switch (payload.type) {
            case "user.created":
                const emailAddress = payload.data.email_addresses[0]?.email_address;

                if (!emailAddress) {
                    console.error("No email address in webhook payload");
                    break;
                }

                // Find the pending user
                const pendingUser = await ctx.runQuery(api.auth.getUserByEmail, {
                    email: emailAddress
                });

                if (pendingUser && pendingUser.clerkId.startsWith("pending_")) {
                    // Get firstName and lastName from metadata or from Clerk payload
                    const firstName = payload.data.public_metadata?.firstName ||
                        payload.data.first_name ||
                        pendingUser.firstName;
                    const lastName = payload.data.public_metadata?.lastName ||
                        payload.data.last_name ||
                        pendingUser.lastName;

                    // Activate the user with real Clerk ID
                    await ctx.runMutation(api.auth.activatePendingUser, {
                        userId: pendingUser._id,
                        clerkId: payload.data.id,
                    });

                    // Update Clerk user with firstName and lastName
                    const clerkAPIKey = process.env.CLERK_SECRET_KEY;
                    if (clerkAPIKey) {
                        try {
                            await fetch(`https://api.clerk.com/v1/users/${payload.data.id}`, {
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
                        } catch (error) {
                            console.error("Failed to update Clerk user with names:", error);
                        }
                    }
                }
                break;
        }

        return new Response(null, { status: 200 });
    }),
});

export default http;