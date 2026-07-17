import { NavLink } from 'react-router-dom';
import { Building2 as StadiumIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { navItemsForRole } from '@/lib/permissions';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { user } = useAuth();
  if (!user) return null;
  const items = navItemsForRole(user.role);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card/50 md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <StadiumIcon className="h-4 w-4" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Smart Stadium OS</p>
          <p className="text-[10px] text-muted-foreground">Digital Twin Platform</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3 scrollbar-thin">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-border p-3 text-[11px] text-muted-foreground">
        All 16 modules live &middot; Payments &amp; AI are simulated
      </div>
    </aside>
  );
}
