"use client";

import SettingsItem from "@/components/settings/settings-item";
import { UserProfile, useUser } from "@clerk/nextjs";
import { useTranslations } from "next-intl";

export default function ProfileSettingsPage() {
  const tCommon = useTranslations("common");
  const tProfile = useTranslations("admin.settings.profileDetails");
  const { user } = useUser();

  const fullName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
    : "";
  const displayName = fullName || user?.username || "User";
  const email = user?.primaryEmailAddress?.emailAddress || "";

  return (
    <div className="flex flex-col gap-6">
      <div className="max-w-[500px]">
        <h2 className="text-xl font-semibold tracking-tight mb-4">
          {tProfile("title")}
        </h2>
        <section>
          <div className="w-full">
            <table className="w-full">
              <tbody>
                <tr className="border-b">
                  <td className="text-sm font-medium py-3 pr-8 w-[220px]">
                    {tProfile("name")}
                  </td>
                  <td className="text-base py-3">{displayName}</td>
                </tr>
                <tr className="border-b">
                  <td className="text-sm font-medium py-3 pr-8 w-[220px]">
                    {tProfile("email")}
                  </td>
                  <td className="text-base py-3">{email}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <UserProfile>
        <UserProfile.Page label="security" />
        <UserProfile.Page label="account" />
      </UserProfile>
    </div>
  );
}
