import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";
import yaaLogo from "@/assets/yaa-logo.png.asset.json";
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
      <div className="container-page flex min-h-16 items-center justify-between gap-3 py-2">
        <Link to="/" aria-label="YAA Mentorship home" className="flex min-w-0 items-center gap-3">
          <img
            src={yaaLogo.url}
            alt="Youth Advocacy Africa"
            width="1757"
            height="687"
            decoding="async"
            className="h-10 w-auto max-w-32 object-contain sm:max-w-40"
          />
          <span className="hidden border-l border-border pl-3 text-sm font-semibold sm:block">
            Mentorship
          </span>
        </Link>

        <nav aria-label="Main navigation" className="flex items-center gap-0.5 text-sm sm:gap-1">
          <Link
            to="/"
            className="rounded px-2 py-2 text-muted-foreground transition-colors hover:text-foreground sm:px-3"
            activeProps={{ className: "text-primary font-semibold" }}
            activeOptions={{ exact: true }}
          >
            Home
          </Link>
          <Link
            to="/mentors"
            className="rounded px-2 py-2 text-muted-foreground transition-colors hover:text-foreground sm:px-3"
            activeProps={{ className: "text-primary font-semibold" }}
          >
            Mentors
          </Link>
          {user ? (
            <>
              <Link
                to="/mentorships"
                className="hidden rounded px-3 py-2 text-muted-foreground transition-colors hover:text-foreground md:inline-flex"
                activeProps={{ className: "text-primary font-semibold" }}
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
      <div className="container-page grid gap-8 py-10 text-sm text-muted-foreground sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <img
            src={yaaLogo.url}
            alt="Youth Advocacy Africa"
            width="1757"
            height="687"
            loading="lazy"
            decoding="async"
            className="mb-4 h-12 w-auto max-w-48 object-contain"
          />
          <p className="max-w-md leading-relaxed">
            YAA Mentorship connects young African advocates with experienced mentors for
            purposeful, accountable growth.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <a
            href="https://yaafrika.org"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground transition-colors hover:text-primary"
          >
            Main Website
          </a>
          <a
            href="mailto:info@yaafrika.org"
            className="font-medium text-foreground transition-colors hover:text-primary"
          >
            Contact Us
          </a>
        </div>
      </div>
    </footer>
  );
}
