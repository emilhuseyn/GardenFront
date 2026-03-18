'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Mail, Lock, Shield, BarChart3, UserCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/lib/stores/authStore';
import { authApi } from '@/lib/api/auth';
import { loginSchema, type LoginFormValues } from '@/lib/utils/validators';
import { cn } from '@/lib/utils/constants';

const featureCards = [
  {
    icon: Shield,
    title: 'Davamiyyət İzləmə',
    desc: 'Real vaxt rejimində FaceID ilə avtomatik qeydiyyat',
    color: '#4A90D9',
    bg: 'rgba(74,144,217,0.15)',
  },
  {
    icon: BarChart3,
    title: 'Maliyyə Hesabatları',
    desc: 'Aylıq ödənişlər, borclar və gəlir analizi',
    color: '#F5A623',
    bg: 'rgba(245,166,35,0.15)',
  },
  {
    icon: UserCircle2,
    title: 'Uşaq Profili',
    desc: 'Hər uşaq üçün tam məlumat bazası',
    color: '#2EC4B6',
    bg: 'rgba(46,196,182,0.15)',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [shakeForm, setShakeForm] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoginError(null);
    try {
      const loginRes = await authApi.login(data.email, data.password);
      // Temporarily store token so authApi.me() can use it
      if (typeof window !== 'undefined') {
        localStorage.setItem('kg_token', loginRes.token);
      }
      const meRes = await authApi.me();
      setAuth(
        {
          id:        String(meRes.id),
          firstName: meRes.firstName,
          lastName:  meRes.lastName,
          name:      meRes.firstName + ' ' + meRes.lastName,
          email:     meRes.email,
          role:      meRes.role,
          isActive:  meRes.isActive,
        },
        loginRes.token
      );
      toast.success('Xoş gəldiniz!');
      router.push('/');
    } catch (err: unknown) {
      setShakeForm(true);
      setTimeout(() => setShakeForm(false), 500);
      const message = err instanceof Error ? err.message : 'E-poçt və ya şifrə yanlışdır';
      setLoginError(message);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── LEFT PANEL (60%) ── */}
      <div className="hidden md:flex md:w-3/5 green-gradient-bg relative overflow-hidden flex-col items-center justify-center p-12">
        {/* Decorative circles */}
        <div className="absolute top-[-80px] left-[-80px] w-64 h-64 rounded-full bg-green-300 opacity-10 blur-3xl" />
        <div className="absolute bottom-[-60px] right-[-60px] w-80 h-80 rounded-full bg-green-400 opacity-10 blur-3xl" />
        <div className="absolute top-1/2 right-[-40px] w-48 h-48 rounded-full bg-green-500 opacity-8 blur-2xl" />

        <div className="relative z-10 max-w-md w-full">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-2.5 mb-8"
          >
            <Image
              src="/KinderGardenLogo.png"
              alt="KinderGarden"
              width={210}
              height={56}
              priority
              className="h-14 w-auto object-contain"
            />
          </motion.div>

          {/* Tagline */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mb-12"
          >
            <h2 className="text-3xl font-bold text-white font-display mb-3 leading-tight">
              Bağçanızı ağıllı<br />idarə edin
            </h2>
            <p className="text-green-200 text-base leading-relaxed">
              Uşaqlar, davamiyyət və ödənişlər - hamısı bir yerdə.
            </p>
          </motion.div>

          {/* Feature Cards */}
          <div className="space-y-3">
            {featureCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  className="glass rounded-xl p-4 flex items-center gap-4 animate-float"
                  style={{ animationDelay: `${i * 0.8}s` }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: card.bg }}
                  >
                    <Icon size={18} style={{ color: card.color }} />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{card.title}</p>
                    <p className="text-green-200 text-xs mt-0.5">{card.desc}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL (40%) ── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-6 md:p-10">
        {/* Mobile brand bar */}
        <div className="md:hidden w-full flex items-center justify-center mb-8">
          <Image
            src="/KinderGardenLogo.png"
            alt="KinderGarden"
            width={172}
            height={44}
            priority
            className="h-11 w-auto object-contain"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={cn(
            'w-full max-w-sm',
            shakeForm && 'animate-shake'
          )}
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900 font-display mb-1.5">
              Xoş gəldiniz 👋
            </h1>
            <p className="text-sm text-gray-500">
              Hesabınıza daxil olmaq üçün məlumatlarınızı daxil edin.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <Input
              {...register('email')}
              label="E-poçt ünvanı"
              type="email"
              placeholder="name@bagca.az"
              error={errors.email?.message}
              leftIcon={<Mail size={15} />}
              autoComplete="email"
              inputSize="lg"
            />

            <Input
              {...register('password')}
              label="Şifrə"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              leftIcon={<Lock size={15} />}
              autoComplete="current-password"
              inputSize="lg"
            />

            {loginError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <span className="mt-0.5 shrink-0">⚠</span>
                <span>{loginError}</span>
              </div>
            )}

            <Button
              type="submit"
              size="xl"
              className="w-full mt-2"
              loading={isSubmitting}
              style={{ boxShadow: '0 4px 14px 0 rgb(52 196 126/0.35)' }}
            >
              Daxil ol
            </Button>
          </form>

          
        </motion.div>
      </div>
    </div>
  );
}
