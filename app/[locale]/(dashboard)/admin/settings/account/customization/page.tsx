"use client";

import { useTranslations } from "next-intl";
import { LangToggle } from "@/components/lang-toggle";
import { ModeToggle } from "@/components/mode-toggle";
import SettingsItem from "@/components/admin/settings/settings-item";

export default function CustomizationSettingsPage() {
  const tCommon = useTranslations("common");

  return (
    <>
      <SettingsItem title={tCommon("theme")}>
        <ModeToggle showText />
      </SettingsItem>
      <SettingsItem title={tCommon("language")}>
        <LangToggle showText />
      </SettingsItem>
    </>
  );
}
