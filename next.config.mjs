const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: '/admitright.html', destination: '/admitright/index.html', permanent: true },
      { source: '/index.html', destination: '/', permanent: true },
      { source: '/login.html', destination: '/?mode=login', permanent: true },
      { source: '/listing.html', destination: '/profile?tab=preview', permanent: true },
      { source: '/services.html', destination: '/profile?tab=services', permanent: true },
      { source: '/dashboard-pending.html', destination: '/dashboard', permanent: true },
      { source: '/student-profile.html', destination: '/person', permanent: true },
      ...[
        'dashboard',
        'students',
        'chats',
        'calls',
        'call',
        'community',
        'community-profile',
        'profile',
        'calendar',
        'reviews',
        'transactions',
        'settings',
        'person',
        'onboarding',
        'otp',
        'approval',
        'marketplace',
        'counselor-public',
      ].map((route) => ({ source: `/${route}.html`, destination: `/${route}`, permanent: true })),
    ];
  },
};
export default nextConfig;
