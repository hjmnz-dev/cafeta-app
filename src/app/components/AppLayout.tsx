import { Outlet, useLocation, Link } from 'react-router';
import {
  Home,
  Compass,
  Plus,
  MessageCircle,
  User,
  Wifi,
  Battery,
  Signal,
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useEffect, useState } from 'react';
import { clockLabel, msToNextMinute } from '../lib/clock';
import { hasUnreadConversation } from '../lib/messages';
import { useInbox } from '../store/conversations-queries';
import { useSession } from '../store/SessionStore';
import { MessageAlerts } from './MessageAlerts';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const BottomNav = () => {
  const location = useLocation();
  const path = location.pathname;
  // Bug 1024: la bandeja la mantiene al día el socket; con algo sin leer,
  // «Mensajes» lleva un punto.
  const { status } = useSession();
  const inbox = useInbox(status === 'authenticated');
  const unreadMessages = hasUnreadConversation(inbox.data?.pages ?? []);

  return (
    <div className="absolute bottom-0 w-full h-[76px] bg-[var(--surface)] border-t border-[var(--line-soft)] flex items-center justify-around px-2 z-50 rounded-b-[40px] md:rounded-b-[40px]">
      <NavItem
        icon={Home}
        label="Home"
        to="/home"
        isActive={path.startsWith('/home')}
      />
      <NavItem
        icon={Compass}
        label="Discover"
        to="/discover"
        isActive={path === '/discover'}
      />
      <div className="flex-shrink-0 -mt-6">
        <Link to="/create-post">
          <button
            aria-label="Crear publicación"
            className="w-14 h-14 bg-[var(--brand)] rounded-full flex items-center justify-center shadow-[0_4px_16px_rgba(214,40,40,0.3)] hover:scale-105 transition-transform"
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        </Link>
      </div>
      <NavItem
        icon={MessageCircle}
        label="Mensajes"
        to="/messages"
        isActive={path === '/messages'}
        dot={unreadMessages}
        dotLabel="tienes mensajes sin leer"
      />
      <NavItem
        icon={User}
        label="Profile"
        to="/profile"
        isActive={path === '/profile'}
      />
    </div>
  );
};

const NavItem = ({
  icon: Icon,
  label,
  to,
  isActive,
  dot = false,
  dotLabel,
}: {
  icon: any;
  label: string;
  to: string;
  isActive: boolean;
  /** Punto de "hay algo nuevo"; `dotLabel` lo dice con palabras. */
  dot?: boolean;
  dotLabel?: string;
}) => (
  <Link
    to={to}
    aria-label={dot && dotLabel ? `${label}, ${dotLabel}` : undefined}
    className="flex flex-col items-center justify-center w-16 gap-1"
  >
    <span className="relative">
      <Icon
        className={cn(
          'w-6 h-6 transition-colors',
          isActive ? 'text-[var(--brand)]' : 'text-[var(--muted)]',
        )}
      />
      {dot && (
        <span
          data-testid={`nav-dot-${to.slice(1)}`}
          className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-[var(--brand)] border-2 border-[var(--surface)]"
        />
      )}
    </span>
    <span
      className={cn(
        'text-[10px] font-medium transition-colors',
        isActive ? 'text-[var(--brand)]' : 'text-[var(--muted)]',
      )}
    >
      {label}
    </span>
  </Link>
);

/** La hora local de quien usa la app; cambia justo al cambiar el minuto. */
function useClock(): string {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setTimeout(
      () => setNow(new Date()),
      msToNextMinute(now),
    );
    return () => window.clearTimeout(timer);
  }, [now]);
  return clockLabel(now);
}

const StatusBar = ({ isDark }: { isDark: boolean }) => {
  const time = useClock();
  return (
    <div
      className={cn(
        'w-full h-12 flex justify-between items-center px-6 absolute top-0 z-50',
        isDark ? 'text-white' : 'text-black',
      )}
    >
      <time
        data-testid="status-clock"
        className="text-[15px] font-semibold tracking-tight mt-1"
      >
        {time}
      </time>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-black rounded-b-[20px]"></div>
      <div className="flex items-center gap-1.5 mt-1">
        <Signal className="w-4 h-4" />
        <Wifi className="w-4 h-4" />
        <Battery className="w-[18px] h-[18px]" />
      </div>
    </div>
  );
};

export function AppLayout() {
  const location = useLocation();
  const path = location.pathname;
  const isSplash = path === '/';
  // Pantallas de pantalla completa sin barra de estado ni navegación inferior.
  // Los textos legales también: se leen sin sesión (spec 0009, decisión 12).
  const isAuthScreen =
    path === '/login' ||
    path === '/register' ||
    path === '/forgot-password' ||
    path === '/reset-password' ||
    path === '/terms' ||
    path === '/privacy';
  // Pantallas internas con header propio: sin navegación inferior, pero con barra de estado.
  const hasOwnHeader =
    path === '/create-post' ||
    path === '/settings' ||
    path === '/profile/edit' ||
    path === '/search' ||
    path === '/create-story' ||
    path.startsWith('/stories/') ||
    // Dentro de un chat el campo de mensaje ocupa el pie (bug 1020).
    path.startsWith('/messages/');
  const showBottomNav = !isSplash && !isAuthScreen && !hasOwnHeader;
  // Perfiles (propio y de terceros) tienen cover rojo → barra de estado clara
  const isProfile = path === '/profile' || path.startsWith('/u/');
  // El visor de historias es a pantalla completa sobre fondo oscuro.
  const isStory = path.startsWith('/stories/');

  return (
    <div className="min-h-screen bg-[var(--surface-3)] flex items-center justify-center font-['DM_Sans',sans-serif] p-0 md:p-8">
      <div className="w-full max-w-[390px] h-[100dvh] md:h-[844px] bg-[var(--app-bg)] relative overflow-hidden md:rounded-[40px] shadow-[0_0_40px_rgba(0,0,0,0.1)] flex flex-col">
        {!isSplash && !isAuthScreen && (
          <StatusBar isDark={isProfile || isStory} />
        )}
        {isSplash && <StatusBar isDark={true} />}

        <div
          className={cn(
            'flex-1 overflow-y-auto no-scrollbar',
            showBottomNav && 'pb-[76px]',
          )}
        >
          <Outlet />
        </div>

        {showBottomNav && <BottomNav />}
        <MessageAlerts />
      </div>
    </div>
  );
}
