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
    <nav className={cn("hidden md:flex items-center gap-7 h-[60px]", className)}>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          className={({ isActive }) =>
            cn(
              "relative flex h-[60px] items-center font-mono text-[11px] uppercase tracking-[0.14em] transition-colors",
              isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:origin-center after:bg-signal after:transition-transform after:duration-300 after:ease-out",
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
