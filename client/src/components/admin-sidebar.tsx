import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  FileText,
  UserCog,
  ArrowLeft,
  Shield,
  Crown,
} from "lucide-react";

const adminMenuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "User Management", url: "/admin/users", icon: Users },
  { title: "Subscription Management", url: "/admin/subscriptions", icon: CreditCard },
  { title: "Document Management", url: "/admin/documents", icon: FileText },
];

const superAdminItems = [
  { title: "Admin Management", url: "/admin/admins", icon: UserCog },
];

export function AdminSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3 px-3 py-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-destructive/10">
            <Shield className="w-5 h-5 text-destructive" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sidebar-foreground" data-testid="text-admin-brand">
              Admin Panel
            </span>
            <span className="text-xs text-muted-foreground">PlagiarismGuard</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`admin-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Super Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {superAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location === item.url}
                      data-testid={`admin-nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
                    >
                      <Link href={item.url}>
                        <item.icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <Link href="/dashboard">
          <Button variant="outline" className="w-full gap-2" data-testid="button-back-to-app">
            <ArrowLeft className="w-4 h-4" />
            Back to App
          </Button>
        </Link>
      </SidebarFooter>
    </Sidebar>
  );
}
