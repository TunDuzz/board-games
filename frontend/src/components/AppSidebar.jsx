import { Home, User, History, Trophy, LogOut, Gamepad2, Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { userService } from "@/services/user.service";
import { authService } from "@/services/auth.service";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { title: "Home", url: "/dashboard", icon: Home },
  { title: "Profile", url: "/profile", icon: User },
  { title: "Match History", url: "/history", icon: History },
  { title: "Rankings", url: "/rankings", icon: Trophy },
];

export function AppSidebar() {
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const data = await userService.getProfile();
        setUser(data);
      } catch (error) {
        console.error("Failed to fetch sidebar user:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  return (
    <Sidebar collapsible="icon" className="border-r bg-background transition-all duration-300 ease-in-out">
      <SidebarHeader className="h-16 border-b p-0 flex items-center justify-center bg-transparent">
        <div className="flex w-full items-center px-4 group-data-[state=collapsed]:px-0 group-data-[state=collapsed]:justify-center transition-all duration-300">
          <div className="flex flex-1 items-center gap-3 overflow-hidden group-data-[state=collapsed]:hidden animate-in fade-in duration-300">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm hover:scale-105 transition-transform">
              <Gamepad2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-base font-bold tracking-tight text-foreground font-outfit uppercase truncate">
              Board Game
            </span>
          </div>
          <SidebarTrigger className="h-8 w-8 rounded-md hover:bg-accent transition-all duration-300 group-data-[state=collapsed]:h-10 group-data-[state=collapsed]:w-10" />
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3 transition-all duration-300">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu className="gap-2 px-2 transition-all duration-300">
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      size="lg"
                      tooltip={item.title}
                      isActive={isActive}
                      className={cn(
                        "relative h-12 w-full justify-start gap-4 rounded-xl px-3 transition-all duration-300 ease-in-out font-outfit",
                        "text-muted-foreground hover:bg-accent/80 hover:text-foreground",
                        "data-[active=true]:bg-accent data-[active=true]:text-foreground data-[active=true]:font-bold",
                        "group overflow-hidden"
                      )}
                    >
                      <NavLink
                        to={item.url}
                        className="flex items-center w-full"
                      >
                        <div className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-300 group-hover:scale-105",
                          isActive ? "bg-primary text-primary-foreground shadow-md" : "bg-transparent text-muted-foreground group-hover:text-foreground"
                        )}>
                          <item.icon className="h-5 w-5" />
                        </div>
                        <span className="text-sm font-semibold tracking-tight transition-all duration-300 group-data-[collapsible=icon]:hidden group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:w-0 ml-1">
                          {item.title}
                        </span>
                        {isActive && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-primary group-data-[collapsible=icon]:hidden animate-in slide-in-from-left-2" />
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2 transition-all duration-300">
        {loading ? (
          <div className="flex items-center justify-center p-2 h-[52px] group-data-[state=collapsed]:h-[108px] transition-all duration-300">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : user ? (
          <div className={cn(
            "flex items-center gap-3 p-2 rounded-xl transition-all duration-300 border border-transparent hover:bg-accent cursor-pointer group/profile",
            "group-data-[state=collapsed]:p-0 group-data-[state=collapsed]:flex-col group-data-[state=collapsed]:gap-4 group-data-[state=collapsed]:py-4"
          )}>
            <div className="relative shrink-0 transition-transform duration-300 group-hover/profile:scale-105">
              <Avatar className="h-9 w-9 rounded-xl border border-border shadow-sm">
                <AvatarFallback className="bg-primary text-primary-foreground font-black text-xs">
                  {(user.full_name || user.username).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-background bg-emerald-500 shadow-sm" />
            </div>

            <div className="flex flex-1 flex-col overflow-hidden group-data-[state=collapsed]:hidden animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="truncate text-sm font-bold text-foreground font-outfit uppercase tracking-tight">
                {user.full_name || user.username}
              </span>
              <span className="truncate text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">
                {user.role?.name || "Member"}
              </span>
            </div>

            <button
              onClick={() => {
                authService.logout();
                window.location.href = "/";
              }}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground/30",
                "transition-all duration-300 hover:bg-destructive/10 hover:text-destructive shrink-0",
                "group-data-[state=collapsed]:mt-1"
              )}
              title="Logout"
            >
              <LogOut className="h-4.5 w-4.5" />
            </button>
          </div>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  );
}
