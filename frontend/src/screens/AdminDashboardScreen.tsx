import { useState, useEffect } from 'react';
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CircleDot,
  CreditCard,
  Lock,
  MessageSquare,
  PieChart,
  Search,
  Send,
  Star,
  Unlock,
  User,
  UserCheck,
  Wallet,
  TrendingUp,
  ShieldCheck,
  Database,
  X,
} from 'lucide-react';
import { useApp } from '../lib/AppContext';
import { supabase } from '../lib/supabase';
import { useAdminStats } from '../hooks/useAdminStats';
import { ChartCard, KpiCard, RevenueTooltip } from '../components/admin/AdminDashboardWidgets';
import { AdminLayout } from '../components/admin/AdminLayout';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartPieChart,
  Pie,
  Cell,
} from 'recharts';

const featureColors = ['#2563eb', '#16a34a', '#f5890b'];

type UserRow = {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  created_at: string;
  last_sign_in_at: string | null;
  premium_until: string | null;
  is_admin: boolean;
};

type SubscriptionRow = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  plan: string;
  amount: number;
  payment_status: string;
  status: string;
  created_at: string;
  paid_at: string | null;
  expiry: string | null;
};

type LandingSourceStats = { source: string; visits: number };

const ADMIN_PAGE_SIZE = 25;

const analyticsCards = {
  task: {
    label: 'Task Analytics', metrics: [
      { label: 'Total Tasks Created', value: '24,850' },
      { label: 'Completion Rate', value: '87.2%' },
      { label: 'Avg Tasks/User', value: '9.4' },
    ],
  },
  meal: {
    label: 'Meal Analytics', metrics: [
      { label: 'Meals Logged', value: '18,430' },
      { label: 'AI Scan Usage', value: '67.4%' },
      { label: 'Avg Calories', value: '1,220 kcal' },
    ],
  },
  sleep: {
    label: 'Sleep Analytics', metrics: [
      { label: 'Sleep Plans Created', value: '4,230' },
      { label: 'Avg Sleep Duration', value: '7h 24m' },
      { label: 'Reminder Engagement', value: '58.9%' },
    ],
  },
  retention: {
    label: 'Retention Analytics', metrics: [
      { label: 'D1 Retention', value: '72.1%' },
      { label: 'D7 Retention', value: '53.5%' },
      { label: 'D30 Retention', value: '38.2%' },
    ],
  },
};

const taskCompletionData = [
  { week: 'W1', completion: 72 },
  { week: 'W2', completion: 78 },
  { week: 'W3', completion: 84 },
  { week: 'W4', completion: 89 },
];

export function AdminDashboardScreen() {
  const { logout } = useApp();
  const {
    stats: dashboardStats,
    userGrowth,
    revenueTrend,
    featureUsage: featureUsageDataState,
    isUsingMockData,
    statsError,
  } = useAdminStats();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [search, setSearch] = useState('');
  const [analyticsTab, setAnalyticsTab] = useState<'task' | 'meal' | 'sleep' | 'retention'>('task');
  const [notification, setNotification] = useState({ title: '', message: '', target: 'all' });
  const [notificationStatus, setNotificationStatus] = useState('');
  const [settings, setSettings] = useState({ push: true, email: false, inApp: true });

  const [userRows, setUserRows] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState('');
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [userRefreshNonce, setUserRefreshNonce] = useState(0);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [userActionError, setUserActionError] = useState('');
  const [loadingUserAction, setLoadingUserAction] = useState(false);
  const [subscriptionRows, setSubscriptionRows] = useState<SubscriptionRow[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);
  const [subscriptionError, setSubscriptionError] = useState('');
  const [subscriptionTotal, setSubscriptionTotal] = useState(0);
  const [subscriptionPage, setSubscriptionPage] = useState(1);
  const [subscriptionSearch, setSubscriptionSearch] = useState('');
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionRow | null>(null);
  const [landingSources, setLandingSources] = useState<LandingSourceStats[]>([]);
  const [landingVisits, setLandingVisits] = useState(0);
  const [loadingLandingStats, setLoadingLandingStats] = useState(false);
  const [landingStatsError, setLandingStatsError] = useState('');

  useEffect(() => {
    if (activeSection !== 'analytics') return;
    let current = true;
    async function fetchLandingStats() {
      setLoadingLandingStats(true);
      setLandingStatsError('');
      const { data, error } = await supabase.rpc('get_admin_landing_page_sources', { p_days: 30 });
      if (!current) return;
      if (error) {
        console.error('Unable to load landing page source analytics:', error);
        setLandingStatsError('Không tải được thống kê. Hãy chạy migration landing page analytics trên Supabase.');
        setLandingSources([]);
        setLandingVisits(0);
      } else if (data && typeof data === 'object') {
        const result = data as { totalVisits?: number; sources?: LandingSourceStats[] };
        setLandingVisits(Number(result.totalVisits) || 0);
        setLandingSources(Array.isArray(result.sources) ? result.sources : []);
      }
      setLoadingLandingStats(false);
    }
    void fetchLandingStats();
    return () => { current = false; };
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== 'users') return;
    let current = true;
    const timeout = window.setTimeout(() => {
      async function fetchUsers() {
        setLoadingUsers(true);
        setUserError('');
        const { data, error } = await supabase.rpc('get_admin_users', {
          p_search: search.trim(),
          p_page: userPage,
          p_page_size: ADMIN_PAGE_SIZE,
        });
        if (!current) return;
        if (error) {
          console.error('Unable to load admin users:', error);
          setUserError('Không thể tải người dùng. Hãy chạy migration quản lý người dùng mới nhất và thử lại.');
          setUserRows([]);
          setUserTotal(0);
        } else if (data && typeof data === 'object') {
          const result = data as { total?: number; users?: UserRow[] };
          setUserRows(Array.isArray(result.users) ? result.users : []);
          setUserTotal(Number(result.total) || 0);
        }
        setLoadingUsers(false);
      }
      void fetchUsers();
    }, 250);

    return () => {
      current = false;
      window.clearTimeout(timeout);
    };
  }, [activeSection, search, userPage, userRefreshNonce]);

  useEffect(() => {
    if (activeSection !== 'subscriptions') return;
    let current = true;
    const timeout = window.setTimeout(() => {
      async function fetchSubscriptions() {
        setLoadingSubscriptions(true);
        setSubscriptionError('');
        const { data, error } = await supabase.rpc('get_admin_subscriptions', {
          p_search: subscriptionSearch.trim(),
          p_page: subscriptionPage,
          p_page_size: ADMIN_PAGE_SIZE,
        });
        if (!current) return;
        if (error) {
          console.error('Unable to load admin subscriptions:', error);
          setSubscriptionError('Không thể tải giao dịch Premium. Hãy kiểm tra migration quản lý người dùng và bảng premium_orders.');
          setSubscriptionRows([]);
          setSubscriptionTotal(0);
        } else if (data && typeof data === 'object') {
          const result = data as { total?: number; subscriptions?: SubscriptionRow[] };
          setSubscriptionRows(Array.isArray(result.subscriptions) ? result.subscriptions : []);
          setSubscriptionTotal(Number(result.total) || 0);
        }
        setLoadingSubscriptions(false);
      }
      void fetchSubscriptions();
    }, 250);

    return () => {
      current = false;
      window.clearTimeout(timeout);
    };
  }, [activeSection, subscriptionPage, subscriptionSearch]);

  async function toggleUserSuspension(user: UserRow) {
    const suspended = user.status === 'Suspended';
    const action = suspended ? 'bỏ tạm ngưng' : 'tạm ngưng';
    if (!window.confirm(`Bạn có chắc muốn ${action} tài khoản ${user.email || user.name}?`)) return;

    setLoadingUserAction(true);
    setUserActionError('');
    const { error } = await supabase.rpc('admin_set_user_suspension', {
      p_user_id: user.id,
      p_suspended: !suspended,
    });
    setLoadingUserAction(false);
    if (error) {
      console.error('Unable to change user suspension:', error);
      setUserActionError('Không thể cập nhật trạng thái tài khoản. Hãy chạy migration quản lý người dùng mới nhất.');
      return;
    }
    setSelectedUser(null);
    setUserRefreshNonce(value => value + 1);
  }

  useEffect(() => {
    setUserPage(1);
  }, [search]);

  useEffect(() => {
    setSubscriptionPage(1);
  }, [subscriptionSearch]);

  function formatDate(value: string | null | undefined) {
    if (!value) return '—';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
  }

  const taskCompletionRate = dashboardStats.totalTasks > 0 ? Math.round((dashboardStats.completedTasks / dashboardStats.totalTasks) * 100) : 0;
  const avgTasksUser = dashboardStats.totalUsers > 0 ? (dashboardStats.totalTasks / dashboardStats.totalUsers).toFixed(1) : '0';

  const analyticsCardsState = {
    ...analyticsCards,
    task: {
      label: 'Task Analytics', metrics: [
        { label: 'Total Tasks Created', value: dashboardStats.totalTasks.toLocaleString() },
        { label: 'Completion Rate', value: `${taskCompletionRate}%` },
        { label: 'Avg Tasks/User', value: avgTasksUser },
      ],
    },
    meal: {
      label: 'Meal Analytics', metrics: [
        { label: 'Meals Logged', value: dashboardStats.totalMeals.toLocaleString() },
        { label: 'AI Scan Usage', value: 'N/A' },
        { label: 'Avg Calories', value: 'N/A' },
      ],
    },
    sleep: {
      label: 'Sleep Analytics', metrics: [
        { label: 'Sleep Plans Created', value: dashboardStats.totalSleepLogs.toLocaleString() },
        { label: 'Avg Sleep Duration', value: 'N/A' },
        { label: 'Reminder Engagement', value: 'N/A' },
      ],
    },
  };

  const selectedAnalytics = analyticsCardsState[analyticsTab];

  function handleSendNotification(type: 'now' | 'schedule') {
    setNotificationStatus(`Thông báo đã ${type === 'now' ? 'gửi ngay' : 'lên lịch'} cho ${notification.target === 'all' ? 'tất cả người dùng' : notification.target === 'premium' ? 'Premium users' : 'Free users'}.`);
  }

  return (
    <AdminLayout activeSection={activeSection} onLogout={() => void logout()} onNavigate={section => {
      setActiveSection(section);
      if (section === 'analytics') setAnalyticsTab('task');
    }}>
          {activeSection === 'dashboard' && (
            <section className="space-y-6">
              {isUsingMockData && (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-medium text-amber-800">
                  Đang hiển thị số liệu demo. {statsError ?? 'Chưa tải được thống kê Supabase.'}
                  {' '}Hãy chạy migration `20261014160000_add_admin_dashboard_stats_rpc.sql` trong đúng project Supabase.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard label="Users" value={dashboardStats.totalUsers.toLocaleString('vi-VN')}
                  description="Total users registered" icon={User} iconClass="bg-sky-50 text-sky-600" />
                <KpiCard label="Active" value={dashboardStats.activeUsersToday.toLocaleString('vi-VN')}
                  description="Active users today" icon={UserCheck} iconClass="bg-teal-50 text-teal-600" />
                <KpiCard label="Premium" value={dashboardStats.premiumUsers.toLocaleString('vi-VN')}
                  description="Premium users" icon={Star} iconClass="bg-orange-50 text-orange-600" />
                <KpiCard label="Revenue" value={`${dashboardStats.monthlyRevenue.toLocaleString('vi-VN')} VNĐ`}
                  description="Monthly recurring revenue" icon={Wallet} iconClass="bg-violet-50 text-violet-600" />
              </div>

              <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
                <div className="grid gap-4 md:grid-cols-2">
                  <ChartCard title="User Growth" description="Jan - Jun" icon={TrendingUp}>
                    <div className="mt-5 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={userGrowth} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                          <XAxis dataKey="month" tickLine={false} axisLine={false} />
                          <YAxis domain={[0, 14000]} ticks={[0, 2000, 4000, 6000, 8000, 10000, 12000, 14000]}
                            tickFormatter={(value) => `${value / 1000}k`} tickLine={false} axisLine={false} />
                          <Tooltip formatter={(value: number) => value.toLocaleString()} />
                          <Line type="monotone" dataKey="users" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>

                  <ChartCard title="Revenue Trend" description="Jan - Jun" icon={CreditCard}>
                    <div className="mt-5 h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={revenueTrend} margin={{ top: 10, right: 0, left: -10, bottom: 0 }}>
                          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                          <XAxis dataKey="month" tickLine={false} axisLine={false} />
                          <YAxis domain={[0, 60_000_000]} ticks={[0, 10_000_000, 20_000_000, 30_000_000, 40_000_000, 50_000_000, 60_000_000]}
                            tickFormatter={(value) => `${value / 1_000_000}M`} tickLine={false} axisLine={false} />
                          <Tooltip content={<RevenueTooltip />} />
                          <Line type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={3} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartCard>
                </div>

                <ChartCard title="Feature Usage" description="Task, Meal, Sleep" icon={CircleDot}>
                  <div className="mt-5 flex flex-col items-center gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="h-56 w-full md:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartPieChart>
                          <Pie data={featureUsageDataState} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} fill="#2563eb">
                            {featureUsageDataState.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={featureColors[index]} />
                            ))}
                          </Pie>
                        </RechartPieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid gap-3 w-full md:w-1/2">
                      {featureUsageDataState.map((item, index) => (
                        <div key={item.name} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <span className="text-sm font-semibold text-slate-700">{item.value}%</span>
                          </div>
                          <div className="mt-3 h-2 rounded-full bg-slate-200">
                            <div className="h-full rounded-full" style={{ width: `${item.value}%`, background: featureColors[index] }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartCard>
              </div>
            </section>
          )}

          {activeSection === 'users' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">User Management</h3>
                    <p className="mt-2 text-sm text-slate-500">Search users by name, email, or ID.</p>
                  </div>
                  <div className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <Search size={16} className="text-slate-500" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search by name, email, or User ID"
                      className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{userTotal.toLocaleString('vi-VN')} tài khoản trong Supabase Auth</span>
                  <span>Trang {userPage} · tối đa {ADMIN_PAGE_SIZE} tài khoản/trang</span>
                </div>
                {userError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{userError}</p>}
                {userActionError && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{userActionError}</p>}
              </div>

              <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">User ID</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Name</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Email</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Plan</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                          Loading users...
                        </td>
                      </tr>
                    ) : userRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                          {search ? 'Không tìm thấy tài khoản phù hợp.' : 'Chưa có tài khoản trong Supabase Auth.'}
                        </td>
                      </tr>
                    ) : (
                      userRows.map((user) => (
                        <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 truncate max-w-[120px]" title={user.id}>{user.id}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{user.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{user.email || '—'}</td>
                          <td className="px-6 py-4 text-sm text-slate-700">{user.plan}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              user.status === 'Active' ? 'bg-emerald-100 text-emerald-700'
                                : user.status === 'Suspended' ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-800'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => { setSelectedUser(user); setUserActionError(''); }}
                                className="inline-flex items-center justify-center rounded-2xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200" aria-label="View user">
                                <ArrowRight size={14} />
                              </button>
                              <button onClick={() => void toggleUserSuspension(user)}
                                disabled={loadingUserAction || user.is_admin}
                                title={user.is_admin ? 'Không thể tạm ngưng tài khoản admin' : user.status === 'Suspended' ? 'Bỏ tạm ngưng' : 'Tạm ngưng'}
                                className="inline-flex items-center justify-center rounded-2xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40"
                                aria-label={user.status === 'Suspended' ? 'Unsuspend user' : 'Suspend user'}>
                                {user.status === 'Suspended' ? <Unlock size={14} /> : <Lock size={14} />}
                              </button>
                              <a href={user.email ? `mailto:${user.email}` : undefined}
                                aria-disabled={!user.email}
                                className="inline-flex items-center justify-center rounded-2xl bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200 aria-disabled:pointer-events-none aria-disabled:opacity-40"
                                aria-label="Message user">
                                <MessageSquare size={14} />
                              </a>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                <button disabled={userPage <= 1 || loadingUsers} onClick={() => setUserPage(page => Math.max(1, page - 1))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40">Trước</button>
                <span className="text-xs text-slate-500">Trang {userPage} / {Math.max(1, Math.ceil(userTotal / ADMIN_PAGE_SIZE))}</span>
                <button disabled={loadingUsers || userPage * ADMIN_PAGE_SIZE >= userTotal}
                  onClick={() => setUserPage(page => page + 1)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40">Tiếp</button>
              </div>
            </section>
          )}

          {activeSection === 'subscriptions' && (
            <section className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-900">Premium Users</p>
                  <p className="mt-4 text-3xl font-semibold text-slate-900">{dashboardStats.premiumUsers.toLocaleString('vi-VN')}</p>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-900">Conversion Rate</p>
                  <div className="mt-4 flex items-center gap-3">
                    <TrendingUp size={18} className="text-emerald-600" />
                    <p className="text-3xl font-semibold text-slate-900">
                      {dashboardStats.totalUsers > 0 ? (dashboardStats.premiumUsers * 100 / dashboardStats.totalUsers).toFixed(1) : '0.0'}%
                    </p>
                  </div>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-900">Monthly Recurring Revenue</p>
                  <p className="mt-4 text-3xl font-semibold text-slate-900">{dashboardStats.monthlyRevenue.toLocaleString('vi-VN')} VNĐ</p>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Lịch sử đơn Premium</h3>
                    <p className="mt-2 text-sm text-slate-500">{subscriptionTotal.toLocaleString('vi-VN')} giao dịch từ Supabase</p>
                  </div>
                  <div className="flex min-w-0 items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 sm:w-[360px]">
                    <Search size={16} className="shrink-0 text-slate-500" />
                    <input value={subscriptionSearch} onChange={event => setSubscriptionSearch(event.target.value)}
                      placeholder="Tìm theo tên, email hoặc mã đơn"
                      className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" />
                  </div>
                </div>
                {subscriptionError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{subscriptionError}</p>}
              </div>

              <div className="overflow-x-auto rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">User</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Package / Amount</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Paid / Created</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Expiry</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {loadingSubscriptions ? (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">Đang tải giao dịch…</td></tr>
                    ) : subscriptionRows.length === 0 ? (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-500">
                        {subscriptionSearch ? 'Không tìm thấy giao dịch phù hợp.' : 'Chưa có đơn Premium trong Supabase.'}
                      </td></tr>
                    ) : subscriptionRows.map(row => (
                      <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="text-sm font-medium text-slate-900">{row.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{row.email || '—'}</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">
                          <p>Premium {row.plan === 'yearly' ? 'Yearly' : 'Monthly'}</p>
                          <p className="mt-1 text-xs text-slate-500">{Number(row.amount).toLocaleString('vi-VN')} VNĐ</p>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{formatDate(row.paid_at ?? row.created_at)}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{formatDate(row.expiry)}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            row.status === 'Active' ? 'bg-emerald-100 text-emerald-700'
                              : row.status === 'Pending' ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                          }`}>{row.status}</span>
                        </td>
                        <td className="px-6 py-4">
                          <button onClick={() => setSelectedSubscription(row)}
                            className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                <button disabled={subscriptionPage <= 1 || loadingSubscriptions}
                  onClick={() => setSubscriptionPage(page => Math.max(1, page - 1))}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40">Trước</button>
                <span className="text-xs text-slate-500">Trang {subscriptionPage} / {Math.max(1, Math.ceil(subscriptionTotal / ADMIN_PAGE_SIZE))}</span>
                <button disabled={loadingSubscriptions || subscriptionPage * ADMIN_PAGE_SIZE >= subscriptionTotal}
                  onClick={() => setSubscriptionPage(page => page + 1)}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40">Tiếp</button>
              </div>
            </section>
          )}

          {activeSection === 'analytics' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Landing page · 30 ngày gần nhất</p>
                    <h3 className="mt-2 text-xl font-semibold text-slate-900">Khách truy cập đến từ đâu?</h3>
                    <p className="mt-1 text-sm text-slate-500">Nguồn được nhận diện từ UTM hoặc referrer của trình duyệt.</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-50 px-5 py-3">
                    <p className="text-xs font-medium text-emerald-800">Tổng lượt mở</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-950">{loadingLandingStats ? '…' : landingVisits.toLocaleString('vi-VN')}</p>
                  </div>
                </div>
                {landingStatsError && <p role="alert" className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">{landingStatsError}</p>}
                {!landingStatsError && !loadingLandingStats && landingSources.length === 0 && (
                  <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-5 text-sm text-slate-500">Chưa có lượt truy cập được ghi nhận trong khoảng thời gian này.</p>
                )}
                {landingSources.length > 0 && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {landingSources.map(({ source, visits }) => {
                      const labels: Record<string, string> = {
                        facebook: 'Facebook', tiktok: 'TikTok', instagram: 'Instagram',
                        zalo: 'Zalo', messenger: 'Messenger', 'direct/unknown': 'Trực tiếp / chưa rõ', other: 'Nguồn khác',
                      };
                      const percentage = landingVisits ? Math.round(visits * 100 / landingVisits) : 0;
                      return <div key={source} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-semibold text-slate-800">{labels[source] ?? source}</span>
                          <span className="text-sm font-bold text-slate-900">{visits.toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
                          <div className="h-full rounded-full bg-emerald-600" style={{ width: `${percentage}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-slate-500">{percentage}% tổng lượt mở</p>
                      </div>;
                    })}
                  </div>
                )}
                <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-950">
                  <p className="font-semibold">Gắn UTM vào link chiến dịch</p>
                  <p className="mt-1 break-all text-blue-900">?utm_source=facebook&amp;utm_medium=social&amp;utm_campaign=ten_chien_dich</p>
                  <p className="mt-1 text-xs text-blue-800">Đổi utm_source thành tiktok, instagram, zalo hoặc messenger cho từng kênh. UTM giúp phân loại chính xác hơn referrer.</p>
                </div>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Analytics</h3>
                    <p className="mt-2 text-sm text-slate-500">Explore task, meal, sleep and retention insights.</p>
                  </div>
                  <div className="inline-flex rounded-3xl bg-slate-50 p-2">
                    {(['task', 'meal', 'sleep', 'retention'] as const).map((key) => (
                      <button
                        key={key}
                        onClick={() => setAnalyticsTab(key)}
                        className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${analyticsTab === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                        {analyticsCardsState[key].label.split(' ')[0]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[0.75fr_1fr]">
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{selectedAnalytics.label}</h4>
                  <div className="mt-6 grid gap-4">
                    {selectedAnalytics.metrics.map((metric) => (
                      <div key={metric.label} className="rounded-3xl bg-slate-50 p-4">
                        <p className="text-sm text-slate-500">{metric.label}</p>
                        <p className="mt-2 text-2xl font-semibold text-slate-900">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Task Completion Trend</p>
                      <p className="mt-1 text-sm text-slate-500">Last 4 weeks</p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700">
                      <TrendingUp size={16} /> Stable
                    </div>
                  </div>
                  <div className="mt-6 h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={taskCompletionData} margin={{ top: 5, right: 0, left: -10, bottom: 5 }}>
                        <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                        <XAxis dataKey="week" tickLine={false} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} />
                        <Tooltip formatter={(value: number) => `${value}%`} />
                        <Line type="monotone" dataKey="completion" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'notifications' && (
            <section className="space-y-6">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-slate-900">Notification Management</h3>
                    <p className="mt-2 text-sm text-slate-500">Send important updates to user segments.</p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-3xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <Bell size={18} /> Target audience
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-900">Title</span>
                    <input
                      value={notification.title}
                      onChange={(event) => setNotification((prev) => ({ ...prev, title: event.target.value }))}
                      className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                      placeholder="Enter notification title"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold text-slate-900">Message</span>
                    <textarea
                      value={notification.message}
                      onChange={(event) => setNotification((prev) => ({ ...prev, message: event.target.value }))}
                      className="mt-2 min-h-[160px] w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500"
                      placeholder="Type your message here"
                    />
                  </label>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Target Users</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      {['all', 'free', 'premium'].map((option) => (
                        <button
                          key={option}
                          onClick={() => setNotification((prev) => ({ ...prev, target: option }))}
                          className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${notification.target === option ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
                        >
                          {option === 'all' ? 'All Users' : option === 'free' ? 'Free Users' : 'Premium Users'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1 text-sm text-slate-500">
                      <p>Schedule or send now to keep users engaged.</p>
                      {notificationStatus && <p className="text-slate-700">{notificationStatus}</p>}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => handleSendNotification('now')}
                        className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        <Send size={16} /> Send Now
                      </button>
                      <button
                        onClick={() => handleSendNotification('schedule')}
                        className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <CalendarDays size={16} /> Schedule
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeSection === 'settings' && (
            <section className="space-y-6">
              <div className="grid gap-4 xl:grid-cols-3">
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center gap-3">
                    <ShieldCheck size={24} className="text-blue-600" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">App Version</p>
                      <p className="mt-1 text-sm text-slate-500">Current version 1.0.0</p>
                    </div>
                  </div>
                  <button className="mt-6 inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
                    Upload New Version
                  </button>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-900">Notification Settings</p>
                  <div className="mt-6 space-y-4">
                    {(['push', 'email', 'inApp'] as const).map((key) => (
                      <div key={key} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{key === 'push' ? 'Push Notifications' : key === 'email' ? 'Email Notifications' : 'In-App Notifications'}</p>
                          <p className="mt-1 text-sm text-slate-500">{key === 'push' ? 'Mobile push alerts' : key === 'email' ? 'Email campaign updates' : 'Banner notifications in app'}</p>
                        </div>
                        <button
                          onClick={() => setSettings((prev) => ({ ...prev, [key]: !prev[key] }))}
                          className={`relative inline-flex h-9 w-16 items-center rounded-full transition ${settings[key] ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                          <span className={`inline-block h-7 w-7 rounded-full bg-white shadow transition ${settings[key] ? 'translate-x-7' : 'translate-x-1'}`}></span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-center gap-3">
                    <Database size={24} className="text-slate-700" />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">System Information</p>
                      <p className="mt-1 text-sm text-slate-500">Status overview for service health.</p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-4">
                    {[
                      { label: 'App Name', value: 'GoClock' },
                      { label: 'Platform', value: 'Web Admin Panel' },
                      { label: 'Database Status', value: 'Healthy' },
                      { label: 'Server Status', value: 'Healthy' },
                    ].map((item) => (
                      <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-sm text-slate-500">{item.label}</p>
                        <p className="mt-1 text-base font-semibold text-slate-900">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {selectedUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
              onMouseDown={event => { if (event.target === event.currentTarget) setSelectedUser(null); }}>
              <section role="dialog" aria-modal="true" aria-labelledby="admin-user-title"
                className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">User details</p>
                    <h2 id="admin-user-title" className="mt-2 text-xl font-bold text-slate-900">{selectedUser.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{selectedUser.email || 'Email unavailable'}</p>
                  </div>
                  <button onClick={() => setSelectedUser(null)} aria-label="Close user details"
                    className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
                </div>

                <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                  {[
                    { label: 'User ID', value: selectedUser.id },
                    { label: 'Plan', value: selectedUser.plan },
                    { label: 'Account status', value: selectedUser.is_admin ? 'Admin' : selectedUser.status },
                    { label: 'Registered', value: formatDate(selectedUser.created_at) },
                    { label: 'Last sign-in', value: formatDate(selectedUser.last_sign_in_at) },
                    { label: 'Premium expiry', value: formatDate(selectedUser.premium_until) },
                  ].map(item => (
                    <div key={item.label} className="min-w-0 rounded-2xl bg-slate-50 p-3">
                      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.label}</dt>
                      <dd className="mt-1 break-all text-sm font-semibold text-slate-800">{item.value}</dd>
                    </div>
                  ))}
                </dl>
                {userActionError && <p role="alert" className="mt-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{userActionError}</p>}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  {selectedUser.email && (
                    <a href={`mailto:${selectedUser.email}`}
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      Gửi email
                    </a>
                  )}
                  {!selectedUser.is_admin && (
                    <button type="button" disabled={loadingUserAction}
                      onClick={() => void toggleUserSuspension(selectedUser)}
                      className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                      {loadingUserAction ? 'Đang cập nhật…' : selectedUser.status === 'Suspended' ? 'Bỏ tạm ngưng' : 'Tạm ngưng tài khoản'}
                    </button>
                  )}
                </div>
              </section>
            </div>
          )}

          {selectedSubscription && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
              onMouseDown={event => { if (event.target === event.currentTarget) setSelectedSubscription(null); }}>
              <section role="dialog" aria-modal="true" aria-labelledby="admin-subscription-title"
                className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Premium order</p>
                    <h2 id="admin-subscription-title" className="mt-2 text-xl font-bold text-slate-900">{selectedSubscription.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{selectedSubscription.email || 'Email unavailable'}</p>
                  </div>
                  <button onClick={() => setSelectedSubscription(null)} aria-label="Close order details"
                    className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
                </div>
                <dl className="mt-6 space-y-3">
                  {[
                    { label: 'Order ID', value: selectedSubscription.id },
                    { label: 'Plan', value: selectedSubscription.plan === 'yearly' ? 'Premium Yearly' : 'Premium Monthly' },
                    { label: 'Amount', value: `${Number(selectedSubscription.amount).toLocaleString('vi-VN')} VNĐ` },
                    { label: 'Payment status', value: selectedSubscription.payment_status },
                    { label: 'Created', value: formatDate(selectedSubscription.created_at) },
                    { label: 'Paid', value: formatDate(selectedSubscription.paid_at) },
                    { label: 'Premium expiry', value: formatDate(selectedSubscription.expiry) },
                  ].map(item => (
                    <div key={item.label} className="flex items-start justify-between gap-4 border-b border-slate-100 pb-2">
                      <dt className="text-sm text-slate-500">{item.label}</dt>
                      <dd className="max-w-[65%] break-all text-right text-sm font-semibold text-slate-800">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            </div>
          )}
    </AdminLayout>
  );
}
