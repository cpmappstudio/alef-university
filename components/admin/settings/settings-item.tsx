"use client";

export default function SettingsItem({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="mx-auto flex w-full  flex-col gap-3 py-4">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <section className="grid gap-4 md:grid-cols-2">{children}</section>
    </div>
  );
}
