"use client";

import { UserProfile } from "@clerk/nextjs";
import { useTranslations } from "next-intl";

export default function ProfileSettingsPage() {
  const tSidebar = useTranslations("admin.settings.sidebar");

  return (
    <UserProfile>
      <UserProfile.Page label="security" />
      <UserProfile.Page label="account" />
    </UserProfile>
  );
}
