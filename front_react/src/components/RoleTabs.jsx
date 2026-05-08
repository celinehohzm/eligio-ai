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
              "relative pb-1 text-sm font-medium transition-[color] duration-200 ease-out",
              isActive ? "font-semibold text-primary" : "text-muted-foreground hover:text-foreground",
              "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-center after:rounded-full after:bg-primary after:transition-transform after:duration-300 after:ease-out",
              isActive ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-[55%]",
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
