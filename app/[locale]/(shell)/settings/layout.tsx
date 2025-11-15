import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col gap-4 md:flex-row">
      <div>
        <SettingsSidebar />
      </div>
      <div className="flex-1 md:px-4 ">{children}</div>
    </div>
  );
}
