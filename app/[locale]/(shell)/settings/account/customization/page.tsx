"use client";

import { useTranslations } from "next-intl";
import { LangToggle } from "@/components/ui/lang-toggle";
import { ModeToggle } from "@/components/ui/mode-toggle";
import SettingsItem from "@/components/settings/settings-item";

export default function CustomizationSettingsPage() {
  const tCommon = useTranslations("common");

  return (
    <div className="flex flex-col gap-4">
      <SettingsItem title={tCommon("theme")}>
        <ModeToggle showText />
      </SettingsItem>
      <SettingsItem title={tCommon("language")}>
        <LangToggle showText />
      </SettingsItem>
    </div>
  );
}
