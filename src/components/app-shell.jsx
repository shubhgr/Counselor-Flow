'use client';
import { useEffect, useLayoutEffect, useState } from 'react';
import Link from 'next/link';
import { Collapsible } from 'radix-ui';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useRuntime } from './runtime-provider';
import { AccountSettings } from './account-settings';
import { Notifications } from './notifications';
import { Icon } from './icon';
import { Button } from './ui/button';
import { ChevronRight, ChevronsUpDown, BadgeCheck, Settings, LogOut } from 'lucide-react';
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from './ui/sidebar';
const GROUPS = [
  [
    'Workspace',
    [
      ['dashboard', 'Dashboard', 'home'],
      ['students', 'People', 'group'],
    ],
  ],
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
    ],
  ],
];
const TITLES = {
  dashboard: 'Dashboard',
  students: 'People',
  chats: 'Chats',
  calls: 'Meets',
  call: 'Meet',
  community: 'Community',
  profile: 'Profile',
  account: 'My account',
  calendar: 'Profile',
  reviews: 'Reviews',
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
  const { isMobile, setOpenMobile, state, setOpen } = useSidebar();
  const [profileExpanded, setProfileExpanded] = useState(activeProfilePage(page));
  useEffect(() => {
    if (activeProfilePage(page)) setProfileExpanded(true);
  }, [pathname]);
  const profileSection = page === 'calendar' ? 'calendar' : params.get('tab') || 'edit';
  const context = params.get('from');
  const returnPage = [
    'dashboard',
    'students',
    'chats',
    'calls',
    'community',
    'transactions',
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
        </SidebarHeader>
        <SidebarContent>
          <nav aria-label="Main navigation">
            {GROUPS.map(([title, links]) => (
              <SidebarGroup key={title}>
                <SidebarGroupLabel>{title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {links.map(([id, label, icon]) =>
                      id === 'profile' ? (
                        <Collapsible.Root
                          key={id}
                          open={profileExpanded}
                          onOpenChange={setProfileExpanded}
                          asChild
                        >
                          <SidebarMenuItem>
                            <Collapsible.Trigger asChild>
                              <SidebarMenuButton
                                tooltip="Profile"
                                isActive={activeProfilePage(page)}
                                onClick={(event) => {
                                  if (state === 'collapsed') {
                                    event.preventDefault();
                                    setOpen(true);
                                    setProfileExpanded(true);
                                  }
                                }}
                              >
                                <Icon name="person" className="ico" />
                                <span className="workspace-nav-text">Profile</span>
                                <ChevronRight
                                  className={`profile-nav-chevron ml-auto ${profileExpanded ? 'rotate-90' : ''}`}
                                />
                              </SidebarMenuButton>
                            </Collapsible.Trigger>
                            <Collapsible.Content>
                              <SidebarMenuSub>
                                {SECTIONS.map(([section, title]) => {
                                  const selected =
                                    activeProfilePage(page) && profileSection === section;
                                  return (
                                    <SidebarMenuSubItem key={section}>
                                      <SidebarMenuSubButton asChild isActive={selected}>
                                        <Link
                                          href={
                                            section === 'calendar'
                                              ? '/calendar'
                                              : `/profile?tab=${section}`
                                          }
                                          aria-current={selected ? 'page' : undefined}
                                          onClick={() => {
                                            if (isMobile) setOpenMobile(false);
                                          }}
                                        >
                                          {title}
                                        </Link>
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  );
                                })}
                              </SidebarMenuSub>
                            </Collapsible.Content>
                          </SidebarMenuItem>
                        </Collapsible.Root>
                      ) : (
                        <SidebarMenuItem key={id}>
                          <SidebarMenuButton
                            asChild
                            isActive={id === 'profile' ? activeProfilePage(page) : active === id}

                            tooltip={label}
                          >
                            <Link
                              prefetch={false}
                              href={`/${id}`}
                              aria-label={label}
                              aria-current={active === id ? 'page' : undefined}
                              onClick={() => {
                                if (isMobile) setOpenMobile(false);
                              }}
                            >
                              <Icon name={icon} className="ico" />
                              <span className="workspace-nav-text">{label}</span>
                              {id === 'chats' && verified && (
                                <span className="workspace-chat-count">5</span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ),
                    )}
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
        <header className="topbar app-header" role="banner">
          <div className="topbar-lead">
            <SidebarTrigger
              id="nav-toggle"
              aria-label={
                isMobile
                  ? 'Open menu'
                  : state === 'collapsed'
                    ? 'Expand sidebar'
                    : 'Collapse sidebar'
              }
              aria-expanded={state === 'expanded'}
            />
            {page === 'person' && (
              <Button variant="ghost" size="icon" asChild>
                <Link id="person-back" href={`/${returnPage}`} aria-label="Back">
                  <Icon name="arrow_back" />
                </Link>
              </Button>
            )}
            <h1 id={page === 'person' ? 'person-top-title' : undefined}>
              {page === 'dashboard'
                ? `Good morning, ${(account?.name || 'Priya Sharma').split(' ')[0]}`
                : TITLES[page] || 'Counselor'}
            </h1>
          </div>
          <div className="actions">
            <div id="page-header-actions" key={`page-actions:${pathname}`} />
            <Notifications />
          </div>
        </header>
        {children}
      </SidebarInset>
    </>
  );
}
