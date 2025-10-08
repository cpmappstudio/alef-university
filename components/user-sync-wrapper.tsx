"use client"

import { useEffect, useRef } from "react"
import { useAuth, useUser } from "@clerk/nextjs"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

export default function UserSyncWrapper({ children }: { children: React.ReactNode }) {
    const { isLoaded: isAuthLoaded, userId } = useAuth()
    const { isLoaded: isUserLoaded, user } = useUser()
    const createOrUpdateUser = useMutation(api.auth.createOrUpdateUser)
    const hasSynced = useRef(false)

    useEffect(() => {
        const syncUser = async () => {
            if (isAuthLoaded && isUserLoaded && userId && user && !hasSynced.current) {
                try {
                    await createOrUpdateUser({
                        clerkId: userId,
                        email: user.emailAddresses[0]?.emailAddress || "",
                        firstName: user.firstName || "",
                        lastName: user.lastName || "",
                        secondLastName: undefined,
                        role: user.publicMetadata?.role as any,
                    })
                    hasSynced.current = true
                    console.log("[UserSyncWrapper] User synced successfully")
                } catch (error) {
                    console.error("[UserSyncWrapper] Error syncing user:", error)
                }
            }
        }

        syncUser()
    }, [isAuthLoaded, isUserLoaded, userId, user, createOrUpdateUser])

    return <>{children}</>
}