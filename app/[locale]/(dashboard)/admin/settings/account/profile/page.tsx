"use client";

import { useTranslations } from "next-intl";

export default function ProfileSettingsPage() {
  const tSidebar = useTranslations("admin.settings.sidebar");

  return (
    <div className="mx-auto flex w-full flex-col gap-2 py-4">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          {tSidebar("profile")}
        </h1>
        <p className="text-sm text-muted-foreground">
          Aquí podrás personalizar la información de tu perfil administrativo.
        </p>
      </header>

      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        Los ajustes de perfil estarán disponibles próximamente. Mientras tanto,
        puedes revisar y actualizar tus preferencias en las secciones de
        personalización y universidad.
      </div>
    </div>
  );
}
