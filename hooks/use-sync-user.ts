"use client"

import { useEffect } from "react"
import { useAuth, useUser } from "@clerk/nextjs"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

export function useSyncUser() {
    const { isLoaded: isAuthLoaded, userId } = useAuth()
    const { isLoaded: isUserLoaded, user } = useUser()
    const createOrUpdateUser = useMutation(api.auth.createOrUpdateUser)

    useEffect(() => {
        const syncUser = async () => {
            if (isAuthLoaded && isUserLoaded && userId && user) {
                try {
                    await createOrUpdateUser({
                        clerkId: userId,
                        email: user.emailAddresses[0]?.emailAddress || "",
                        firstName: user.firstName || "",
                        lastName: user.lastName || "",
                        secondLastName: undefined,
                        role: user.publicMetadata?.role as any,
                    })
                } catch (error) {
                    console.error("[useSyncUser] Error syncing user:", error)
                }
            }
        }

        syncUser()
    }, [isAuthLoaded, isUserLoaded, userId, user, createOrUpdateUser])
}