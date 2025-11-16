# Users and Authentication Example App

This example demonstrates how to add users and authentication to a basic chat
app. It uses [Clerk](https://clerk.dev/) for authentication.

Users are initially presented with a "Log In" button. After user's sign up,
their information is persisted to a `users` table via a webhook. When users send
messages, each message is associated with the user that sent it. Lastly, users
can log out with a "Log Out" button.

## Running the App

Run

```sh
npm run dev
```

It will complain that an environment variable is missing. Follow the next steps
to set it.

### Set up Clerk credentials

Follow the instructions in https://docs.convex.dev/auth/clerk#get-started to
obtain:

- A _publishable key_, set it as `VITE_CLERK_PUBLISHABLE_KEY` in `.env.local`.
- A JWT template _Issuer URL_, set it as `CLERK_JWT_ISSUER_DOMAIN` on your
  Convex dashboard.

At this point you should see `npm run dev` succeed, but you still need to set up
one more variable.

### Setting up webhooks in Clerk

On your Clerk dashboard, go to _Webhooks_, click on _+ Add Endpoint_.

Set _Endpoint URL_ to
`https://<your deployment name>.convex.site/clerk-users-webhook`. You can see
your deployment name in `.env.local` in this directory. For example, the
endpoint URL could be:
`https://ardent-mammoth-732.convex.site/clerk-users-webhook`.

In _Message Filtering_, select **user** for all user events (scroll down or use
the search input).

Click on _Create_.

After the endpoint is saved, copy the _Signing Secret_ (on the right side of the
UI), it should start with `whsec_`. Set it as the value of the
`CLERK_WEBHOOK_SECRET` environment variable in your Convex dashboard.

From now on, when a user signs up you should see logs from the HTTP handler as
well as a new row in the users table in the Convex dashboard.

### Debugging webhooks

If your setup wasn't correct and you signed in already, Clerk will not sent
another user creation event to your webhook endpoint. To repeat the webhook flow
from initial sign up, go to the Clerk dashboard, click on _Users_, find your
user and delete it from the _..._ menu.

---

# Welcome to your Convex functions directory!

Write your Convex functions here.
See https://docs.convex.dev/functions for more.

A query function that takes two arguments looks like:

```ts
// convex/myFunctions.ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const myQueryFunction = query({
  // Validators for arguments.
  args: {
    first: v.number(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Read the database as many times as you need here.
    // See https://docs.convex.dev/database/reading-data.
    const documents = await ctx.db.query("tablename").collect();

    // Arguments passed from the client are properties of the args object.
    console.log(args.first, args.second);

    // Write arbitrary JavaScript here: filter, aggregate, build derived data,
    // remove non-public properties, or create new objects.
    return documents;
  },
});
```

Using this query function in a React component looks like:

```ts
const data = useQuery(api.myFunctions.myQueryFunction, {
  first: 10,
  second: "hello",
});
```

A mutation function looks like:

```ts
// convex/myFunctions.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const myMutationFunction = mutation({
  // Validators for arguments.
  args: {
    first: v.string(),
    second: v.string(),
  },

  // Function implementation.
  handler: async (ctx, args) => {
    // Insert or modify documents in the database here.
    // Mutations can also read from the database like queries.
    // See https://docs.convex.dev/database/writing-data.
    const message = { body: args.first, author: args.second };
    const id = await ctx.db.insert("messages", message);

    // Optionally, return a value from your mutation.
    return await ctx.db.get(id);
  },
});
```

Using this mutation function in a React component looks like:

```ts
const mutation = useMutation(api.myFunctions.myMutationFunction);
function handleButtonPress() {
  // fire and forget, the most common way to use mutations
  mutation({ first: "Hello!", second: "me" });
  // OR
  // use the result once the mutation has completed
  mutation({ first: "Hello!", second: "me" }).then((result) =>
    console.log(result),
  );
}
```

Use the Convex CLI to push your functions to a deployment. See everything
the Convex CLI can do by running `npx convex -h` in your project root
directory. To learn more, launch the docs with `npx convex docs`.
