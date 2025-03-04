"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartBarIcon, TableCellsIcon, Cog6ToothIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";
import { NotificationCenter } from "@/components/ui/NotificationCenter";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { UserCircle2, LogOut } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: ChartBarIcon },
  { name: "Trade Log", href: "/trades", icon: TableCellsIcon },
  { name: "Import Trades", href: "/import", icon: ArrowUpTrayIcon },
  { name: "Settings", href: "/settings", icon: Cog6ToothIcon },
];

export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="flex h-screen w-64 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex h-16 items-center justify-between border-b border-gray-200 px-6 dark:border-gray-800">
        <h1 className="text-lg font-semibold">Trading Journal</h1>
        {session?.user && (
          <div className="flex items-center gap-1">
            <NotificationCenter />
            <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              {session.user.image ? (
                <img 
                  src={session.user.image} 
                  alt={session.user.name || 'User'} 
                  className="rounded-full w-6 h-6" 
                />
              ) : (
                <UserCircle2 className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    {
                      "bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-gray-50": isActive,
                      "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-50": !isActive,
                    }
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      {session?.user && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium truncate">
              {session.user.name || session.user.email}
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              asChild
            >
              <Link href="/api/auth/signout">
                <LogOut className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}