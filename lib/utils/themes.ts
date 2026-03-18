export type ThemeKey =
  | 'green' | 'blue' | 'purple'
  | 'rose' | 'orange' | 'amber'
  | 'teal' | 'indigo' | 'pink' | 'slate';

export interface ThemeOption {
  key: ThemeKey;
  label: string;
  primary: string;   // main accent (400)
  bg: string;        // very light bg (50) for active state
  swatches: [string, string, string]; // 400, 300, 200
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    key: 'green',
    label: 'Yaşıl (default)',
    primary: '#34C47E',
    bg: '#EDFAF3',
    swatches: ['#34C47E', '#6DD9A8', '#A8EBCA'],
  },
  {
    key: 'blue',
    label: 'Göy',
    primary: '#4A90D9',
    bg: '#EFF6FD',
    swatches: ['#4A90D9', '#77AEED', '#AECEF5'],
  },
  {
    key: 'purple',
    label: 'Bənövşəyi',
    primary: '#A855F7',
    bg: '#FAF0FE',
    swatches: ['#A855F7', '#CC85FA', '#E4B7FC'],
  },
  {
    key: 'rose',
    label: 'Qızılgül',
    primary: '#F43F5E',
    bg: '#FFF1F3',
    swatches: ['#F43F5E', '#FB7185', '#FECDD3'],
  },
  {
    key: 'orange',
    label: 'Narıncı',
    primary: '#F97316',
    bg: '#FFF4ED',
    swatches: ['#F97316', '#FB923C', '#FED7AA'],
  },
  {
    key: 'amber',
    label: 'Sarı',
    primary: '#F59E0B',
    bg: '#FFFBEB',
    swatches: ['#F59E0B', '#FBBF24', '#FDE68A'],
  },
  {
    key: 'teal',
    label: 'Firuzəyi',
    primary: '#14B8A6',
    bg: '#F0FDFA',
    swatches: ['#14B8A6', '#2DD4BF', '#99F6E4'],
  },
  {
    key: 'indigo',
    label: 'İndiqo',
    primary: '#6366F1',
    bg: '#EEF2FF',
    swatches: ['#6366F1', '#818CF8', '#C7D2FE'],
  },
  {
    key: 'pink',
    label: 'Çəhrayı',
    primary: '#EC4899',
    bg: '#FDF2F8',
    swatches: ['#EC4899', '#F472B6', '#FBCFE8'],
  },
  {
    key: 'slate',
    label: 'Şifer',
    primary: '#64748B',
    bg: '#F8FAFC',
    swatches: ['#64748B', '#94A3B8', '#CBD5E1'],
  },
];

// Full color scales for each theme (green-50 … green-900 + white tokens)
const PALETTE: Record<ThemeKey, Record<string, string>> = {
  green: {
    '50':  '#EDFAF3', '100': '#D4F5E4', '200': '#A8EBCA',
    '300': '#6DD9A8', '400': '#34C47E', '500': '#22A965',
    '600': '#1A8B52', '700': '#156B3F', '800': '#0F4E2E', '900': '#0A3320',
    soft: '#F8FAF9', warm: '#F0F5F2', border: '#E4EDE8',
  },
  blue: {
    '50':  '#EFF6FD', '100': '#D6E8FA', '200': '#AECEF5',
    '300': '#77AEED', '400': '#4A90D9', '500': '#3176C0',
    '600': '#2560A4', '700': '#1A4882', '800': '#113062', '900': '#0A1D42',
    soft: '#F5F8FD', warm: '#EDF2FA', border: '#D3E1F4',
  },
  purple: {
    '50':  '#FAF0FE', '100': '#F2DCFE', '200': '#E4B7FC',
    '300': '#CC85FA', '400': '#A855F7', '500': '#8B3ED9',
    '600': '#6F2CB5', '700': '#561D92', '800': '#3D1070', '900': '#270A4F',
    soft: '#F9F5FE', warm: '#F3EBFD', border: '#E3D2F8',
  },
  rose: {
    '50':  '#FFF1F3', '100': '#FFE4E8', '200': '#FECDD3',
    '300': '#FDA4AF', '400': '#F43F5E', '500': '#E11D48',
    '600': '#BE123C', '700': '#9F1239', '800': '#881337', '900': '#4C0519',
    soft: '#FFF8F9', warm: '#FFEEF1', border: '#FECDD3',
  },
  orange: {
    '50':  '#FFF4ED', '100': '#FFEDD5', '200': '#FED7AA',
    '300': '#FDBA74', '400': '#F97316', '500': '#EA580C',
    '600': '#C2410C', '700': '#9A3412', '800': '#7C2D12', '900': '#431407',
    soft: '#FFF8F3', warm: '#FFF1E6', border: '#FED7AA',
  },
  amber: {
    '50':  '#FFFBEB', '100': '#FEF3C7', '200': '#FDE68A',
    '300': '#FCD34D', '400': '#F59E0B', '500': '#D97706',
    '600': '#B45309', '700': '#92400E', '800': '#78350F', '900': '#451A03',
    soft: '#FFFDF5', warm: '#FFFAEB', border: '#FDE68A',
  },
  teal: {
    '50':  '#F0FDFA', '100': '#CCFBF1', '200': '#99F6E4',
    '300': '#5EEAD4', '400': '#14B8A6', '500': '#0D9488',
    '600': '#0F766E', '700': '#115E59', '800': '#134E4A', '900': '#042F2E',
    soft: '#F5FEFD', warm: '#EEFCFA', border: '#99F6E4',
  },
  indigo: {
    '50':  '#EEF2FF', '100': '#E0E7FF', '200': '#C7D2FE',
    '300': '#A5B4FC', '400': '#6366F1', '500': '#4F46E5',
    '600': '#4338CA', '700': '#3730A3', '800': '#312E81', '900': '#1E1B4B',
    soft: '#F5F6FF', warm: '#ECEEFF', border: '#C7D2FE',
  },
  pink: {
    '50':  '#FDF2F8', '100': '#FCE7F3', '200': '#FBCFE8',
    '300': '#F9A8D4', '400': '#EC4899', '500': '#DB2777',
    '600': '#BE185D', '700': '#9D174D', '800': '#831843', '900': '#500724',
    soft: '#FEF7FB', warm: '#FDEEF6', border: '#FBCFE8',
  },
  slate: {
    '50':  '#F8FAFC', '100': '#F1F5F9', '200': '#E2E8F0',
    '300': '#CBD5E1', '400': '#64748B', '500': '#475569',
    '600': '#334155', '700': '#1E293B', '800': '#0F172A', '900': '#020617',
    soft: '#F8FAFC', warm: '#F1F5F9', border: '#E2E8F0',
  },
};

/**
 * Applies a theme by overriding the Tailwind v4 CSS custom properties on <html>.
 * Tailwind v4 utilities like `bg-green-400` reference `var(--color-green-400)`,
 * so overriding them at runtime changes the entire UI palette.
 */
export function applyTheme(key: ThemeKey): void {
  if (typeof window === 'undefined') return;
  const p = PALETTE[key];
  const root = document.documentElement;
  (['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'] as const).forEach((n) => {
    root.style.setProperty(`--color-green-${n}`, p[n]);
  });
  root.style.setProperty('--color-white-soft',   p.soft);
  root.style.setProperty('--color-white-warm',   p.warm);
  root.style.setProperty('--color-white-border', p.border);
}

const FONT_SIZE_MAP: Record<string, string> = {
  sm: '13px',
  md: '14px',
  lg: '16px',
};

export function applyFontSize(size: string): void {
  if (typeof window === 'undefined') return;
  document.documentElement.style.setProperty('font-size', FONT_SIZE_MAP[size] ?? '14px');
}

const RADIUS_MAP: Record<string, Record<string, string>> = {
  sharp: {
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.625rem',
    '2xl': '0.75rem',
    '3xl': '1rem',
  },
  soft: {
    sm: '0.125rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.25rem',
    '3xl': '1.75rem',
  },
  round: {
    sm: '0.25rem',
    md: '0.625rem',
    lg: '0.875rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '2.25rem',
  },
};

export function applyRadius(preset: string): void {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  const p = RADIUS_MAP[preset] ?? RADIUS_MAP.soft;
  root.style.setProperty('--radius-sm', p.sm);
  root.style.setProperty('--radius-md', p.md);
  root.style.setProperty('--radius-lg', p.lg);
  root.style.setProperty('--radius-xl', p.xl);
  root.style.setProperty('--radius-2xl', p['2xl']);
  root.style.setProperty('--radius-3xl', p['3xl']);
}

export function applyDarkMode(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  document.documentElement.classList.toggle('dark', enabled);
}

export function buildThemeInitScript(): string {
  const green = PALETTE.green;
  const greenVars = Object.entries(green)
    .map(([token, value]) => {
      if (token === 'soft') return `root.style.setProperty('--color-white-soft','${value}')`;
      if (token === 'warm') return `root.style.setProperty('--color-white-warm','${value}')`;
      if (token === 'border') return `root.style.setProperty('--color-white-border','${value}')`;
      return `root.style.setProperty('--color-green-${token}','${value}')`;
    })
    .join(';');

  const cases = Object.entries(PALETTE)
    .map(([key, palette]) => {
      const body = Object.entries(palette)
        .map(([token, value]) => {
          if (token === 'soft') return `root.style.setProperty('--color-white-soft','${value}')`;
          if (token === 'warm') return `root.style.setProperty('--color-white-warm','${value}')`;
          if (token === 'border') return `root.style.setProperty('--color-white-border','${value}')`;
          return `root.style.setProperty('--color-green-${token}','${value}')`;
        })
        .join(';');
      return `case '${key}':${body};break;`;
    })
    .join('');

  return `(function(){try{var root=document.documentElement;var raw=localStorage.getItem('kg-themes');if(!raw){${greenVars};root.style.setProperty('--radius-sm','0.125rem');root.style.setProperty('--radius-md','0.5rem');root.style.setProperty('--radius-lg','0.75rem');root.style.setProperty('--radius-xl','1rem');root.style.setProperty('--radius-2xl','1.25rem');root.style.setProperty('--radius-3xl','1.75rem');return;}var parsed=JSON.parse(raw);var state=parsed&&parsed.state?parsed.state:{};var authRaw=localStorage.getItem('kg-auth');var authParsed=authRaw?JSON.parse(authRaw):null;var authState=authParsed&&authParsed.state?authParsed.state:{};var user=authState.user;var userThemes=state.userThemes||{};var themeKey=user&&user.id&&userThemes[user.id]?userThemes[user.id]:'green';var fontSize=state.fontSize||'md';var darkMode=!!state.darkMode;var radius=state.radius||'soft';switch(themeKey){${cases}default:${greenVars};}root.style.setProperty('font-size', fontSize==='sm'?'13px':fontSize==='lg'?'16px':'14px');if(radius==='sharp'){root.style.setProperty('--radius-sm','0.125rem');root.style.setProperty('--radius-md','0.375rem');root.style.setProperty('--radius-lg','0.5rem');root.style.setProperty('--radius-xl','0.625rem');root.style.setProperty('--radius-2xl','0.75rem');root.style.setProperty('--radius-3xl','1rem');}else if(radius==='round'){root.style.setProperty('--radius-sm','0.25rem');root.style.setProperty('--radius-md','0.625rem');root.style.setProperty('--radius-lg','0.875rem');root.style.setProperty('--radius-xl','1.25rem');root.style.setProperty('--radius-2xl','1.5rem');root.style.setProperty('--radius-3xl','2.25rem');}else{root.style.setProperty('--radius-sm','0.125rem');root.style.setProperty('--radius-md','0.5rem');root.style.setProperty('--radius-lg','0.75rem');root.style.setProperty('--radius-xl','1rem');root.style.setProperty('--radius-2xl','1.25rem');root.style.setProperty('--radius-3xl','1.75rem');}root.classList.toggle('dark', darkMode);}catch(e){}})();`;
}
