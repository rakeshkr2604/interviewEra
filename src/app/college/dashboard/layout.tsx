import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { Users, BarChart3, Calendar, Settings, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/college/dashboard', label: 'Overview', icon: Home },
  { href: '/college/dashboard/students', label: 'Students', icon: Users },
  { href: '/college/dashboard/deadlines', label: 'Deadlines', icon: Calendar },
  { href: '/college/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/college/dashboard/settings', label: 'Settings', icon: Settings },
];

async function getCampusOrg(adminUserId: string) {
  const serviceClient = createServiceClient();
  const { data } = await serviceClient
    .from('campus_organizations')
    .select('id, name')
    .eq('admin_user_id', adminUserId)
    .single();
  return data;
}

export default async function CollegeDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const org = await getCampusOrg(user.id);

  if (!org) {
    redirect('/college/signup');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{org.name}</h1>
              <p className="text-sm text-gray-600">T&P Officer Dashboard</p>
            </div>
            <Link
              href="/dashboard"
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Back to Student Mode
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 p-4 sm:p-6">
          {/* Sidebar */}
          <nav className="space-y-1 lg:col-span-1">
            <ul className="space-y-1">
              {navItems.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      'hover:bg-gray-100 text-gray-700'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Content */}
          <div className="lg:col-span-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
