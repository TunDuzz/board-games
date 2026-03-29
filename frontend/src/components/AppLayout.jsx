import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Outlet } from "react-router-dom";
import { GlobalNotificationListener } from "./GlobalNotificationListener";

export function AppLayout({ children }) {
  // Read sidebar state from cookie on initial load
  const sidebarState = document.cookie
    .split("; ")
    .find((row) => row.startsWith("sidebar:state="))
    ?.split("=")[1];

  const defaultOpen = sidebarState === "undefined" ? true : sidebarState === "true";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <GlobalNotificationListener />
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <main className="flex-1 overflow-auto p-6">
          {children || <Outlet />}
        </main>
      </div>
    </SidebarProvider>
  );
}
