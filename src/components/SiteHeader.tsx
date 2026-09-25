import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="border-b border-border bg-card">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded bg-primary text-sm font-semibold text-primary-foreground">
            YAA
          </span>
          <span className="text-sm font-semibold tracking-tight sm:text-base">
            YAA Mentorship
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          <Link
            to="/mentors"
            className="rounded px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
            activeProps={{ className: "text-foreground font-medium" }}
          >
            Mentors
          </Link>
          {user ? (
            <>
              <Link
                to="/mentorships"
                className="rounded px-3 py-2 text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground font-medium" }}
              >
                My mentorships
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger className="ml-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <UserAvatar
                    path={profile?.avatar_url}
                    name={profile?.full_name || user.email || "You"}
                    className="size-9"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">{user.email}</div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/account">Account &amp; roles</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/mentor-profile">Mentor profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/admin">Admin</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>Sign out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild size="sm" className="ml-2">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-border bg-card">
      <div className="container-page flex flex-col gap-1 py-8 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Youth Advocacy Africa</p>
        <p>YAA Mentorship connects young advocates with experienced mentors.</p>
      </div>
    </footer>
  );
}
