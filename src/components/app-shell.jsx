'use client';
import { useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useRuntime } from './runtime-provider';
import { AccountSettings } from './account-settings';
import { Notifications } from './notifications';
import { PersonDrawer } from './person-drawer';
import { Icon } from './icon';
import { Button } from './ui/button';
import { ChevronsUpDown, BadgeCheck, Settings, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuItem,
} from './ui/dropdown-menu';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from './ui/sidebar';
const GROUPS = [
  ['Workspace', [['dashboard', 'Dashboard', 'home']]],
  [
    'Connect',
    [
      ['chats', 'Chats', 'chat'],
      ['calls', 'Meet', 'videocam'],
      ['community', 'Community', 'forum'],
    ],
  ],
  [
    'You',
    [
      ['profile', 'Profile', 'person'],
      ['transactions', 'Transactions', 'payments'],
      ['reviews', 'Reviews', 'star'],
      ['badges', 'Badges', 'workspace_premium'],
    ],
  ],
];
const TITLES = {
  dashboard: 'Dashboard',
  students: 'People',
  chats: 'Chats',
  calls: 'Meet',
  call: 'Meet',
  community: 'Community',
  profile: 'Profile',
  account: 'My account',
  calendar: 'Calendar',
  reviews: 'Reviews',
  badges: 'Badges',
  transactions: 'Transactions',
  settings: 'Settings',
  person: 'Profile',
  'design-system': 'Design system',
};
function activeProfilePage(page) {
  return ['profile', 'calendar'].includes(page);
}
const SECTIONS = [
  ['edit', 'Overview'],
  ['services', 'Services & fee'],
  ['testimonials', 'Testimonials'],
  ['calendar', 'Calendar'],
  ['preview', 'Student preview'],
];

export function AppShell({ children }) {
  return (
    <SidebarProvider
      data-next-app
      defaultOpen={false}
      className="counselor-app h-dvh min-h-0 overflow-hidden"
      style={{
        '--sidebar-width': 'var(--sidebar-w)',
        '--sidebar-width-icon': 'var(--sidebar-collapsed-w)',
        '--sidebar': 'var(--workspace-nav-bg)',
        '--sidebar-foreground': 'var(--workspace-nav-fg)',
        '--sidebar-accent': 'var(--workspace-nav-active)',
        '--sidebar-accent-foreground': 'var(--workspace-nav-fg)',
      }}
    >
      <WorkspaceChrome>{children}</WorkspaceChrome>
    </SidebarProvider>
  );
}
function WorkspaceChrome({ children }) {
  const router = useRouter();
  const pathname = usePathname(),
    params = useSearchParams();
  const page = pathname.split('/').pop();
  const pageTitle = activeProfilePage(page) ? 'Profile' : TITLES[page] || 'Counselor';
  useEffect(() => {
    document.title = `${pageTitle} — GradRight Counselor`;
  }, [pageTitle]);
  const [accountOpen, setAccountOpen] = useState(false);
  useEffect(() => {
    if (params.get('account') === '1') setAccountOpen(true);
  }, [params]);
  useEffect(() => {
    const show = () => setAccountOpen(true);
    window.addEventListener('counselor:account', show);
    return () => window.removeEventListener('counselor:account', show);
  }, []);
  function closeAccount(value) {
    setAccountOpen(value);
    if (!value && params.has('account')) {
      const next = new URLSearchParams(params.toString());
      next.delete('account');
      router.replace(pathname + (next.size ? `?${next}` : ''));
    }
  }
  const { account, verified } = useRuntime();
  const { isMobile, setOpenMobile, state } = useSidebar();
  const profileSection = page === 'calendar' ? 'calendar' : params.get('tab') || 'edit';
  const context = params.get('from');
  const returnPage = [
    'dashboard',
    'students',
    'chats',
    'calls',
    'community',
    'transactions',
    'reviews',
    'badges',
  ].includes(context)
    ? context
    : context === 'call'
      ? 'calls'
      : 'students';
  const active =
    page === 'calendar'
      ? 'profile'
      : page === 'call'
        ? 'calls'
        : page === 'person'
          ? returnPage
          : page;
  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);
  useLayoutEffect(() => {
    document.body.dataset.page = page === 'calendar' ? 'profile' : page;
  }, [page]);
  return (
    <>
      {accountOpen && <AccountSettings open={accountOpen} onOpenChange={closeAccount} />}
      <Sidebar id="app-sidebar" className="counselor-sidebar" collapsible="icon">
        <SidebarHeader className="workspace-sidebar-header px-3 py-4">
          <Link href="/dashboard" className="brand-mark" aria-label="GradRight dashboard">
            <img className="brand-logo" src="/assets/gradright-logo.png" alt="GradRight" />
          </Link>
          {!isMobile && (
            <SidebarTrigger
              className="workspace-sidebar-toggle"
              aria-label={state === 'collapsed' ? 'Expand sidebar' : 'Collapse sidebar'}
              title={state === 'collapsed' ? 'Expand sidebar' : 'Collapse sidebar'}
            />
          )}
        </SidebarHeader>
        <SidebarContent>
          <nav aria-label="Main navigation">
            {GROUPS.map(([title, links]) => (
              <SidebarGroup key={title} className="group-data-[collapsible=icon]:px-1">
                <SidebarGroupLabel>{title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {links.map(([id, label, icon]) => (
                      <SidebarMenuItem key={id}>
                        <SidebarMenuButton
                          asChild
                          className="group-data-[collapsible=icon]:w-full! group-data-[collapsible=icon]:justify-center"
                          isActive={id === 'profile' ? activeProfilePage(page) : active === id}
                          tooltip={label}
                        >
                          <Link
                            prefetch={false}
                            href={id === 'profile' ? '/profile?tab=edit' : `/${id}`}
                            aria-label={id === 'chats' && verified ? 'Chats, 5 unread' : label}
                            aria-current={
                              (id === 'profile' ? activeProfilePage(page) : active === id)
                                ? 'page'
                                : undefined
                            }
                            onClick={() => {
                              if (isMobile) setOpenMobile(false);
                            }}
                          >
                            <Icon name={icon} className="ico" />
                            <span className="workspace-nav-text">{label}</span>
                            {id === 'chats' && verified && (
                              <span className="workspace-chat-count" aria-hidden="true">
                                5
                              </span>
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </nav>
        </SidebarContent>
        <SidebarFooter className="workspace-sidebar-footer">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="workspace-account-trigger"
                    tooltip="Account"
                    aria-label="Account menu"
                  >
                    <Avatar className="size-8 rounded-lg">
                      <AvatarImage src={account?.photo || undefined} alt="Account photo" />
                      <AvatarFallback>{account?.initials || 'PS'}</AvatarFallback>
                    </Avatar>
                    <div className="workspace-account-details grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {account?.name || 'Priya Sharma'}
                      </span>
                      <span className="truncate text-xs opacity-70">
                        {account?.email || (verified ? 'Verified' : 'Not verified')}
                      </span>
                    </div>
                    <ChevronsUpDown className="workspace-account-chevron ml-auto size-4" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side={isMobile ? 'bottom' : 'right'}
                  align="end"
                  sideOffset={8}
                  className="workspace-account-menu min-w-56 rounded-lg"
                >
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5">
                      <Avatar className="size-8 rounded-lg">
                        <AvatarImage src={account?.photo || undefined} alt="Account photo" />
                        <AvatarFallback>{account?.initials || 'PS'}</AvatarFallback>
                      </Avatar>
                      <div className="grid text-sm leading-tight">
                        <span className="font-semibold">{account?.name || 'Priya Sharma'}</span>
                        <span className="text-xs text-muted-foreground">
                          {account?.email || 'Counselor account'}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onSelect={() => setAccountOpen(true)}>
                      <BadgeCheck />
                      My account
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link href="/settings">
                        <Settings />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      window.GradRightSession?.clear();
                      router.push('/');
                    }}
                  >
                    <LogOut />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <SidebarInset
        className={`main bg-[var(--bg)]${['students', 'community'].includes(page) ? ' community-main' : ''}`}
      >
        {page !== 'chats' && (
          <header className="topbar app-header" role="banner">
            <div className="topbar-lead">
              {isMobile && <SidebarTrigger id="nav-toggle" aria-label="Open menu" />}
              {page === 'person' && (
                <Button variant="ghost" size="icon" asChild>
                  <Link id="person-back" href={`/${returnPage}`} aria-label="Back">
                    <Icon name="arrow_back" />
                  </Link>
                </Button>
              )}
              <h1 id={page === 'person' ? 'person-top-title' : undefined}>{pageTitle}</h1>
            </div>
            <div className="actions">
              {activeProfilePage(page) && (
                <nav className="profile-header-nav" aria-label="Profile sections">
                  {SECTIONS.map(([section, title]) => {
                    const selected = profileSection === section;
                    return (
                      <Link
                        key={section}
                        prefetch={false}
                        href={section === 'calendar' ? '/calendar' : `/profile?tab=${section}`}
                        className={`profile-header-tab${selected ? ' is-active' : ''}`}
                        data-label={title}
                        aria-current={selected ? 'page' : undefined}
                      >
                        {title}
                      </Link>
                    );
                  })}
                </nav>
              )}
              <div id="page-header-actions" key={`page-actions:${pathname}`} />
              <Notifications />
            </div>
          </header>
        )}
        {children}
        <PersonDrawer key={pathname + params.toString()} />
      </SidebarInset>
    </>
  );
}
