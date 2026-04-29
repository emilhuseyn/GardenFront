'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { Save, User, Shield, Palette, Plus, Users, Check, Search, ArrowUpDown, ChevronUp, ChevronDown, Settings as SettingsIcon, MessageCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Switch';
import { Modal, ModalHeader, ModalTitle, ModalFooter, ModalContent } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils/constants';
import { useAuthStore } from '@/lib/stores/authStore';
import { useUIStore, type SidebarSizePreset } from '@/lib/stores/uiStore';
import { useThemeStore, type FontSize, type RadiusPreset } from '@/lib/stores/themeStore';
import { applyTheme, applyFontSize, applyRadius, THEME_OPTIONS, type ThemeKey } from '@/lib/utils/themes';
import { usersApi } from '@/lib/api/users';
import { authApi } from '@/lib/api/auth';
import type { UserResponse, UserRole } from '@/types';
import { systemSettingsApi, type SystemSetting } from '@/lib/api/systemSettings';

const TABS = [
  { id: 'profile',       label: 'Profil',          icon: User,    adminOnly: false },
  { id: 'users',         label: 'İstifadəçilər',   icon: Users,   adminOnly: true  },
  { id: 'system',        label: 'Sistem',          icon: SettingsIcon, adminOnly: true  },
  { id: 'security',      label: 'Təhlükəsizlik',   icon: Shield,  adminOnly: false },
  { id: 'appearance',    label: 'Görünüş',         icon: Palette, adminOnly: false },
];

const ROLE_LABELS: Record<string, string> = {
  Administrator:   'Administrator',
  Accountant:      'Mühasib',
  Teacher:         'Müəllim',
  AdmissionStaff:  'Qəbul məsulu',
};

const ROLE_OPTIONS = [
  { value: 'Administrator',  label: 'Administrator' },
  { value: 'Accountant',     label: 'Mühasib' },
  { value: 'Teacher',        label: 'Müəllim' },
  { value: 'AdmissionStaff', label: 'Qəbul məsulu' },
];

interface UserFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: UserRole;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'Administrator';

  const safeStr = (v: string | undefined) => (!v || v === 'undefined' ? '' : v);

  const [profileForm, setProfileForm] = useState({
    firstName: safeStr(user?.firstName),
    lastName:  safeStr(user?.lastName),
    email:     safeStr(user?.email),
  });
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    setProfileForm((p) => ({
      ...p,
      firstName: safeStr(user?.firstName),
      lastName:  safeStr(user?.lastName),
      email:     safeStr(user?.email),
    }));
  }, [user]);

  const updateUser = useAuthStore((s) => s.updateUser);

  const handleProfileSave = async () => {
    if (!user) return;
    setProfileSaving(true);
    try {
      const updated = await authApi.updateProfile({
        firstName: profileForm.firstName,
        lastName:  profileForm.lastName,
        email:     profileForm.email,
      });
      updateUser({
        firstName: updated.firstName,
        lastName:  updated.lastName,
        email:     updated.email,
        name:      `${updated.firstName} ${updated.lastName}`,
      });
      toast.success('Profil yadda saxlanıldı');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xəta baş verdi');
    } finally {
      setProfileSaving(false);
    }
  };

  const [users, setUsers] = useState<UserResponse[]>([]);
  const [createUserModal, setCreateUserModal] = useState(false);
  const [removeCandidate, setRemoveCandidate] = useState<UserResponse | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [roleChangingId, setRoleChangingId] = useState<string | null>(null);

  // ── Users filter / sort state ───────────────────────────────────────────
  const [userSearch, setUserSearch]       = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userStatusFilter, setUserStatusFilter] = useState('all');
  type UserSortField = 'name' | 'role' | 'createdAt';
  const [userSortField, setUserSortField]   = useState<UserSortField>('createdAt');
  const [userSortAsc, setUserSortAsc]       = useState(false);

  const filteredUsers = users
    .filter((u) => {
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      const matchSearch =
        !userSearch ||
        fullName.includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchRole   = userRoleFilter   === 'all' || u.role      === userRoleFilter;
      const matchStatus = userStatusFilter === 'all' || (userStatusFilter === 'active' ? u.isActive : !u.isActive);
      return matchSearch && matchRole && matchStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (userSortField === 'name') {
        cmp = `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      } else if (userSortField === 'role') {
        cmp = a.role.localeCompare(b.role);
      } else {
        cmp = (a.createdAt ?? '').localeCompare(b.createdAt ?? '');
      }
      return userSortAsc ? cmp : -cmp;
    });

  const toggleSort = (field: UserSortField) => {
    if (userSortField === field) setUserSortAsc((v) => !v);
    else { setUserSortField(field); setUserSortAsc(true); }
  };

  const SortIcon = ({ field }: { field: UserSortField }) =>
    userSortField !== field ? <ArrowUpDown size={11} className="opacity-40" /> :
    userSortAsc   ? <ChevronUp size={11} /> : <ChevronDown size={11} />;

  const { register: regUser, handleSubmit: handleUserSubmit, reset: resetUser, formState: { errors: userErrors, isSubmitting: userSubmitting } } = useForm<UserFormValues>();

  const loadUsers = async () => {
    try {
      const list = await usersApi.getAll();
      setUsers(list);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'İstifadəçilər yüklənmədi');
    }
  };

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  const onCreateUser = async (data: UserFormValues) => {
    try {
      await usersApi.create(data);
      await loadUsers();
      setCreateUserModal(false);
      toast.success('İstifadəçi yaradıldı');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xəta baş verdi');
    }
  };

  const setTheme    = useThemeStore((s) => s.setTheme);
  const userThemes  = useThemeStore((s) => s.userThemes);
  const activeThemeKey: ThemeKey = user ? (userThemes[user.id] ?? 'green') : 'green';
  const handleThemeChange = (key: ThemeKey) => {
    if (!user) return;
    setTheme(user.id, key);
    applyTheme(key);
  };

  const fontSize          = useThemeStore((s) => s.fontSize);
  const setFontSize       = useThemeStore((s) => s.setFontSize);
  const radius            = useThemeStore((s) => s.radius);
  const setRadius         = useThemeStore((s) => s.setRadius);

  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    applyFontSize(size);
  };

  const handleRadiusChange = (preset: RadiusPreset) => {
    setRadius(preset);
    applyRadius(preset);
  };

  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const sidebarSize = useUIStore((s) => s.sidebarSize);
  const setSidebarSize = useUIStore((s) => s.setSidebarSize);


  const handlePasswordChange = async () => {
    if (passwordForm.next !== passwordForm.confirm) {
      toast.error('Yeni şifrələr uyğun deyil');
      return;
    }
    if (passwordForm.next.length < 8) {
      toast.error('Şifrə ən azı 8 simvol olmalıdır');
      return;
    }
    setPasswordSaving(true);
    try {
      await authApi.changePassword(passwordForm.current, passwordForm.next);
      setPasswordForm({ current: '', next: '', confirm: '' });
      toast.success('Şifrə uğurla dəyişdirildi');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xəta baş verdi');
    } finally {
      setPasswordSaving(false);
    }
  };

  // ── System Params ─────────────────────────────────────────────────────────
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const loadSystemSettings = async () => {
    setSettingsLoading(true);
    try {
      // Load messaging status from the backend
      const response = await systemSettingsApi.getMessagingStatus();
      // Initialize system settings with the messaging status
      setSystemSettings([
        {
          id: 1,
          settingKey: 'WhatsApp_Enabled',
          settingValue: response.data?.enabled?.toString() || 'false',
          description: 'WhatsApp göndərişlərini aktivləşdirir'
        }
      ]);
    } catch (err: unknown) {
      toast.error('Sistem parametrləri yüklənmədi');
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'system' && isAdmin) {
      loadSystemSettings();
    }
  }, [activeTab, isAdmin]);

  const handleToggleWhatsApp = async (checked: boolean) => {
    try {
      await systemSettingsApi.toggleMessaging(checked);
      setSystemSettings((prev) => {
        const hasKey = prev.find(p => p.settingKey === 'WhatsApp_Enabled');
        if (hasKey) {
          return prev.map(p => p.settingKey === 'WhatsApp_Enabled' ? { ...p, settingValue: checked.toString() } : p);
        }
        return [...prev, { id: 0, settingKey: 'WhatsApp_Enabled', settingValue: checked.toString(), description: 'WhatsApp göndərişlərini aktivləşdirir' }];
      });
      toast.success(`WhatsApp mesajları ${checked ? 'aktiv' : 'deaktiv'} edildi`);
    } catch (err: unknown) {
      toast.error('Dəyişiklik yadda saxlanılmadı');
      loadSystemSettings(); // rollback UI
    }
  };


  return (
    <div className="space-y-6">
      <PageHeader title="Parametrlər" description="Sistem və profil parametrləri" />

      <div className="flex flex-col lg:flex-row gap-5">
        {/* Sidebar tabs */}
        <div className="lg:w-52 shrink-0">
          <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-2 space-y-0.5">
            {TABS.filter((tab) => !tab.adminOnly || isAdmin).map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left text-sm transition-all',
                    activeTab === tab.id
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-200'
                  )}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1 bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-2xl p-6"
        >
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-50 font-display">Profil məlumatları</h3>
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                <Avatar name={user?.name && !user.name.includes('undefined') ? user.name : (user?.email ?? 'Admin')} size="xl" ring />
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-gray-50">
                    {user?.firstName && user.firstName !== 'undefined' ? `${user.firstName} ${user.lastName}` : (user?.email ?? 'Admin İstifadəçi')}
                  </p>
                  <p className="text-xs text-gray-400">{user?.email ?? 'admin@example.com'}</p>
                  <Badge variant="green" size="xs" className="mt-1">
                    {ROLE_LABELS[user?.role ?? 'administrator']}
                  </Badge>
                </div>
              </div>

              {isAdmin ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Ad"
                    value={profileForm.firstName}
                    onChange={(e) => setProfileForm((p) => ({ ...p, firstName: e.target.value }))}
                  />
                  <Input
                    label="Soyad"
                    value={profileForm.lastName}
                    onChange={(e) => setProfileForm((p) => ({ ...p, lastName: e.target.value }))}
                  />
                  <Input
                    label="E-poçt"
                    type="email"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm((p) => ({ ...p, email: e.target.value }))}
                  />
                  <Input
                    label="Vəzifə"
                    value={ROLE_LABELS[user?.role ?? '']}
                    disabled
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Input label="Ad Soyad" value={user?.name ?? ''} disabled />
                    <Input label="E-poçt" value={user?.email ?? ''} disabled />
                    <Input label="Vəzifə" value={ROLE_LABELS[user?.role ?? '']} disabled />
                  </div>
                </div>
              )}

              <Button onClick={handleProfileSave} loading={profileSaving}>
                <Save size={14} /> Dəyişiklikləri saxla
              </Button>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-50 font-display">İstifadəçilər</h3>
                <Button size="sm" onClick={() => { resetUser(); setCreateUserModal(true); }}>
                  <Plus size={13} /> Yeni istifadəçi
                </Button>
              </div>

              {/* Filter / Search bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Ad, e-poçt və ya telefon axtar..."
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="all">Bütün rollar</option>
                  {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
                <select
                  value={userStatusFilter}
                  onChange={(e) => setUserStatusFilter(e.target.value)}
                  className="px-3 py-2 text-sm rounded-lg border border-white-border dark:border-gray-700/60 bg-white dark:bg-[#1e2130] text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="all">Bütün statuslar</option>
                  <option value="active">Aktiv</option>
                  <option value="inactive">Deaktiv</option>
                </select>
              </div>

              {/* Sort bar */}
              <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="mr-1">Sıralama:</span>
                {(['name', 'role', 'createdAt'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => toggleSort(f)}
                    className={cn(
                      'flex items-center gap-0.5 px-2 py-1 rounded-md border transition-colors',
                      userSortField === f
                        ? 'border-primary/60 bg-primary/10 text-primary font-medium'
                        : 'border-white-border dark:border-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-700/40'
                    )}
                  >
                    {f === 'name' ? 'Ad' : f === 'role' ? 'Rol' : 'Tarix'}
                    <SortIcon field={f} />
                  </button>
                ))}
                <span className="ml-auto text-gray-400">{filteredUsers.length} nəticə</span>
              </div>

              <div className="space-y-2">
                {filteredUsers.length === 0 && (
                  <p className="text-sm text-gray-400 py-6 text-center">İstifadəçi tapılmadı</p>
                )}
                {filteredUsers.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-white-border dark:border-gray-700/60 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                    <Avatar name={`${u.firstName} ${u.lastName}`} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{u.firstName} {u.lastName}</p>
                        <Badge variant={u.isActive ? 'green' : 'gray'} size="xs">
                          {u.isActive ? 'Aktiv' : 'Deaktiv'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                      {u.createdAt && (
                        <p className="text-xs text-gray-400 truncate">
                          {new Date(u.createdAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          {' '}
                          {new Date(u.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>

                    {/* Inline role selector */}
                    {u.id !== user?.id ? (
                      <div className="relative shrink-0">
                        <select
                          value={u.role}
                          disabled={roleChangingId === u.id}
                          onChange={async (e) => {
                            const newRole = e.target.value as UserRole;
                            setRoleChangingId(u.id);
                            try {
                              await usersApi.updateRole(u.id, newRole);
                              await loadUsers();
                              toast.success(`Rol dəyişdirildi: ${ROLE_LABELS[newRole]}`);
                            } catch (err: unknown) {
                              toast.error(err instanceof Error ? err.message : 'Rol dəyişdirilmədi');
                            } finally {
                              setRoleChangingId(null);
                            }
                          }}
                          className={cn(
                            'appearance-none pl-2.5 pr-7 py-1.5 text-xs rounded-lg border font-medium transition-all outline-none cursor-pointer',
                            'border-primary/30 bg-primary/5 text-primary dark:bg-primary/10',
                            'hover:border-primary/60 focus:ring-2 focus:ring-primary/20',
                            roleChangingId === u.id && 'opacity-50 cursor-wait'
                          )}
                        >
                          {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                        <ChevronDown size={11} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-primary" />
                      </div>
                    ) : (
                      <Badge variant="green" size="xs">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                    )}

                    {u.id !== user?.id && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {u.isActive ? (
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={async () => {
                              try {
                                await usersApi.update(u.id, {
                                  firstName: u.firstName,
                                  lastName: u.lastName,
                                  email: u.email,
                                  role: u.role,
                                  isActive: false,
                                });
                                await loadUsers();
                                toast.success('İstifadəçi deaktiv edildi');
                              } catch (err: unknown) {
                                toast.error(err instanceof Error ? err.message : 'Xəta baş verdi');
                              }
                            }}
                          >
                            Deaktiv et
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="xs"
                              variant="secondary"
                              onClick={async () => {
                                try {
                                  await usersApi.update(u.id, {
                                    firstName: u.firstName,
                                    lastName: u.lastName,
                                    email: u.email,
                                    role: u.role,
                                    isActive: true,
                                  });
                                  await loadUsers();
                                  toast.success('İstifadəçi aktiv edildi');
                                } catch (err: unknown) {
                                  toast.error(err instanceof Error ? err.message : 'Xəta baş verdi');
                                }
                              }}
                            >
                              Aktiv et
                            </Button>
                            <Button
                              size="xs"
                              variant="danger"
                              onClick={() => setRemoveCandidate(u)}
                            >
                              Sil
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-5">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-50 font-display">Şifrə dəyişikliyi</h3>
              <Input
                label="Cari şifrə"
                type="password"
                value={passwordForm.current}
                onChange={(e) => setPasswordForm((p) => ({ ...p, current: e.target.value }))}
              />
              <Input
                label="Yeni şifrə"
                type="password"
                hint="Ǝn azı 8 simvol, rəqəm və hərif"
                value={passwordForm.next}
                onChange={(e) => setPasswordForm((p) => ({ ...p, next: e.target.value }))}
              />
              <Input
                label="Yeni şifrəni təkrarlayın"
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirm: e.target.value }))}
              />
              <Button onClick={handlePasswordChange} loading={passwordSaving}>
                <Save size={14} /> Şifrəni yenilə
              </Button>
            </div>
          )}

          {activeTab === 'system' && isAdmin && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-50 font-display">Sistem parametrləri</h3>
              
              {settingsLoading ? (
                <div className="flex flex-col gap-4">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <Skeleton className="h-16 w-full rounded-xl" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* WhatsApp Integration Setting */}
                  <div className="flex items-center justify-between p-4 rounded-xl border border-white-border dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/40">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500 rounded-lg">
                          <MessageCircle size={16} />
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">WhatsApp Mesajları</p>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Sistem üzərindən WhatsApp mesajlarının göndərilməsini aktivləşdirir.
                      </p>
                    </div>
                    {(() => {
                      const wpSet = systemSettings.find(s => s.settingKey === 'WhatsApp_Enabled');
                      const checked = wpSet?.settingValue === 'true';
                      return (
                        <Switch
                          checked={checked}
                          onCheckedChange={handleToggleWhatsApp}
                        />
                      );
                    })()}
                  </div>
                  
                  {/* other potential system systems can go here dynamically */}
                  {systemSettings.filter(s => s.settingKey !== 'WhatsApp_Enabled').map(s => (
                    <div key={s.id} className="flex items-center justify-between p-4 rounded-xl border border-white-border dark:border-gray-700/60 bg-gray-50 dark:bg-gray-800/40">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{s.settingKey}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{s.description || s.settingValue}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-50 font-display">Görünüş</h3>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Rəng mövzusu</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {THEME_OPTIONS.map((t) => {
                    const isActive = activeThemeKey === t.key;
                    return (
                      <button
                        key={t.key}
                        onClick={() => handleThemeChange(t.key)}
                        className={cn(
                          'relative flex flex-col items-center gap-2.5 p-4 rounded-2xl border-2 transition-all',
                          isActive
                            ? 'shadow-sm'
                            : 'border-white-border dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700'
                        )}
                        style={isActive ? { borderColor: t.primary, backgroundColor: t.bg } : {}}
                      >
                        {/* Color swatch preview */}
                        <div className="flex gap-1.5">
                          {t.swatches.map((c, i) => (
                            <div key={i} className="w-5 h-5 rounded-full" style={{ backgroundColor: c }} />
                          ))}
                        </div>
                        <span
                          className="text-xs font-medium"
                          style={{ color: isActive ? t.primary : '#6B7280' }}
                        >
                          {t.label}
                        </span>
                        {isActive && (
                          <div
                            className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: t.primary }}
                          >
                            <Check size={9} className="text-white stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-2">Seçilmiş mövzu yalnız sizin hesabınıza tətbiq olunur</p>
              </div>

              {/* Font size */}
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Font ölçüsü</p>
                <div className="flex gap-2">
                  {([
                    { key: 'sm' as FontSize, label: 'Kiçik', sample: 'Aa' },
                    { key: 'md' as FontSize, label: 'Normal', sample: 'Aa' },
                    { key: 'lg' as FontSize, label: 'Böyük',  sample: 'Aa' },
                  ]).map((f) => (
                    <button
                      key={f.key}
                      onClick={() => handleFontSizeChange(f.key)}
                      className={cn(
                        'flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all',
                        fontSize === f.key
                          ? 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'border-white-border dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      )}
                    >
                      <span style={{ fontSize: f.key === 'sm' ? '13px' : f.key === 'lg' ? '20px' : '16px' }} className="font-bold">{f.sample}</span>
                      <span className="text-xs">{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Künc radiusu</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'sharp' as RadiusPreset, label: 'Kəskin',  sampleClass: 'rounded-md' },
                    { key: 'soft' as RadiusPreset,  label: 'Yumşaq',  sampleClass: 'rounded-xl' },
                    { key: 'round' as RadiusPreset, label: 'Dairəvi', sampleClass: 'rounded-2xl' },
                  ]).map((r) => (
                    <button
                      key={r.key}
                      onClick={() => handleRadiusChange(r.key)}
                      className={cn(
                        'flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-all',
                        radius === r.key
                          ? 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'border-white-border dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      )}
                    >
                      <div className={cn('w-12 h-7 border border-gray-300 dark:border-gray-500 bg-white/70 dark:bg-gray-700/60', r.sampleClass)} />
                      <span className="text-xs">{r.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Bütün kart, modal və düymələr üçün ümumi radius səviyyəsi</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Sidebar ölçüsü</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'narrow' as SidebarSizePreset, label: 'Dar', width: 'w-8' },
                    { key: 'normal' as SidebarSizePreset, label: 'Normal', width: 'w-10' },
                    { key: 'wide' as SidebarSizePreset, label: 'Geniş', width: 'w-12' },
                  ]).map((s) => (
                    <button
                      key={s.key}
                      onClick={() => setSidebarSize(s.key)}
                      className={cn(
                        'flex flex-col items-center gap-2 py-3 rounded-xl border-2 transition-all',
                        sidebarSize === s.key
                          ? 'border-green-400 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'border-white-border dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      )}
                    >
                      <div className="h-7 w-14 border border-gray-300 dark:border-gray-500 rounded-md flex items-center justify-start px-1 bg-white/70 dark:bg-gray-700/60">
                        <div className={cn('h-5 rounded-sm bg-gray-400/80 dark:bg-gray-300/70', s.width)} />
                      </div>
                      <span className="text-xs">{s.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">Naviqasiya panelinin genişlik səviyyəsi</p>
              </div>

              {/* Currency format */}
            </div>
          )}

        </motion.div>
      </div>

      {/* Create user modal */}
      <Modal open={createUserModal} onOpenChange={(open) => !open && setCreateUserModal(false)}>
        <ModalContent size="sm">
          <ModalHeader>
            <ModalTitle>Yeni istifadəçi yarat</ModalTitle>
          </ModalHeader>
          <form onSubmit={handleUserSubmit(onCreateUser)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                {...regUser('firstName', { required: 'Ad mütləqdir' })}
                label="Ad *"
                placeholder="Aysel"
                error={userErrors.firstName?.message}
              />
              <Input
                {...regUser('lastName', { required: 'Soyad mütləqdir' })}
                label="Soyad *"
                placeholder="Əliyeva"
                error={userErrors.lastName?.message}
              />
            </div>
            <Input
              {...regUser('email', { required: 'E-poçt mütləqdir' })}
              label="E-poçt *"
              type="email"
              placeholder="user@kindergarden.az"
              error={userErrors.email?.message}
            />
            <Input
              {...regUser('password', { required: 'Şifrə mütləqdir', minLength: { value: 6, message: 'Ən azı 6 simvol' } })}
              label="Şifrə *"
              type="password"
              placeholder="••••••••"
              error={userErrors.password?.message}
            />
            <Select
              {...regUser('role', { required: 'Rol seçin' })}
              label="Rol *"
              options={ROLE_OPTIONS}
              error={userErrors.role?.message}
            />
            <ModalFooter>
              <Button type="button" variant="secondary" onClick={() => setCreateUserModal(false)}>Ləğv et</Button>
              <Button type="submit" loading={userSubmitting}>Yarat</Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Modal>

      {/* Remove user modal */}
      <Modal open={removeCandidate !== null} onOpenChange={(open) => !open && setRemoveCandidate(null)}>
        <ModalContent size="sm">
          <ModalHeader>
            <ModalTitle>İstifadəçini sil</ModalTitle>
          </ModalHeader>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {removeCandidate
              ? `${removeCandidate.firstName} ${removeCandidate.lastName} istifadəçisini silmək istədiyinizə əminsiniz?`
              : 'İstifadəçini silmək istədiyinizə əminsiniz?'}
          </p>
          <ModalFooter>
            <Button type="button" variant="secondary" onClick={() => setRemoveCandidate(null)}>
              Ləğv et
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={removeLoading}
              onClick={async () => {
                if (!removeCandidate) return;
                setRemoveLoading(true);
                try {
                  await usersApi.remove(removeCandidate.id);
                  await loadUsers();
                  setRemoveCandidate(null);
                  toast.success('İstifadəçi silindi');
                } catch (err: unknown) {
                  toast.error(err instanceof Error ? err.message : 'Xəta baş verdi');
                } finally {
                  setRemoveLoading(false);
                }
              }}
            >
              Sil
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </div>
  );
}
