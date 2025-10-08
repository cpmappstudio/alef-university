"use client"

import { useEffect } from "react"
import { useAuth, useUser } from "@clerk/nextjs"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

export default function UserSyncWrapper({ children }: { children: React.ReactNode }) {
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
                    console.log("[UserSyncWrapper] User synced successfully")
                } catch (error) {
                    console.error("[UserSyncWrapper] Error syncing user:", error)
                }
            }
        }

        syncUser()
    }, [isAuthLoaded, isUserLoaded, userId, user?.publicMetadata?.role, createOrUpdateUser])

    return <>{children}</>
}