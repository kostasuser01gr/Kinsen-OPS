"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Car,
  FileText,
  ListTodo,
  DollarSign,
  MessageSquare,
  AlertTriangle,
  BarChart3,
  Shield,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LayoutDashboard,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: "fleet:read" },
  { label: "Fleet", href: "/fleet", icon: Car, permission: "fleet:read" },
  { label: "Rentals", href: "/rentals", icon: FileText, permission: "rental:read" },
  { label: "Tasks", href: "/tasks", icon: ListTodo, permission: "task:read" },
  { label: "Finance", href: "/finance", icon: DollarSign, permission: "finance:read" },
  { label: "Chat", href: "/chat", icon: MessageSquare, permission: "chat:read" },
  { label: "Incidents", href: "/incidents", icon: AlertTriangle, permission: "incident:read" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, permission: "analytics:read" },
  { label: "Audit Log", href: "/audit", icon: Shield, permission: "audit:read" },
];

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" onClick={onClick}>
      <Menu className="h-5 w-5" />
    </Button>
  );
}

export function Sidebar({
  mobileOpen,
  onMobileClose,
}: {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileClose?.();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between border-b px-3 py-4">
        {!collapsed && (
          <Link href="/fleet" className="flex items-center gap-2">
            <Car className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">Kinsen Ops</span>
          </Link>
        )}
        {/* Desktop collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="hidden md:flex h-8 w-8"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
        {/* Mobile close button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden h-8 w-8"
          onClick={onMobileClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile sidebar (slide-in drawer) */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-card shadow-lg transition-transform duration-200 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-card transition-all duration-200",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
