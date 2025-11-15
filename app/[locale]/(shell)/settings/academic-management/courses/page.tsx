"use client";

import { useTranslations } from "next-intl";
import { useQuery } from "convex/react";
import SettingsItem from "@/components/settings/settings-item";
import { BimesterCreateDialog } from "@/components/settings/bimester-create-dialog";
import { BimestersTable } from "@/components/settings/bimesters-table";
import { api } from "@/convex/_generated/api";

export default function BimestersSettingsPage() {
  const t = useTranslations("admin.settings");
  const tPage = useTranslations("admin.settings.bimestersPage");
  const bimestersQuery = useQuery(api.bimesters.getAllBimesters, {});
  const bimesters = bimestersQuery ?? [];
  const isLoadingBimesters = bimestersQuery === undefined;

  return (
    <>
      <SettingsItem title={t("bimesters")}>
        <div className="col-span-2 space-y-4">
          <div className="flex flex-col gap-4 items-left justify-between w-full">
            <p className="text-sm text-muted-foreground">
              {tPage("description")}
            </p>
            <BimesterCreateDialog />
          </div>

          <BimestersTable
            bimesters={bimesters}
            isLoading={isLoadingBimesters}
          />
        </div>
      </SettingsItem>
    </>
  );
}
