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
                    // Activate the user with real Clerk ID
                    await ctx.runMutation(api.auth.activatePendingUser, {
                        userId: pendingUser._id,
                        clerkId: payload.data.id,
                    });
                }
                break;
        }

        return new Response(null, { status: 200 });
    }),
});

export default http;