import { NavLink } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getTopNavItemsForRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

export default function RoleTabs({ className }) {
  const { user } = useAuth();
  const items = getTopNavItemsForRole(user?.role);

  if (!items.length) {
    return null;
  }

  return (
    <nav className={cn("hidden md:flex items-center space-x-8", className)}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          className={({ isActive }) =>
            cn(
              "text-sm font-medium transition-colors",
              isActive ? "text-blue-700" : "text-gray-600 hover:text-blue-600",
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
