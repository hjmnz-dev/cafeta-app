import { useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router';
import { UserX } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError, userMessageOf } from '../lib/http';
import { useDeactivateAccount } from '../store/account-queries';
import { useSession } from '../store/SessionStore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';

/**
 * HU05: desactivar la propia cuenta. No se desactiva hasta confirmar con la
 * contraseña (spec 0009, decisión 11). Al terminar, la sesión local se cierra y
 * se vuelve al login.
 */
export function DeactivateAccount({
  sectionTitle,
  card,
}: {
  sectionTitle: string;
  card: string;
}) {
  const navigate = useNavigate();
  const { logout } = useSession();
  const deactivate = useDeactivateAccount();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');

  const changeOpen = (next: boolean) => {
    if (deactivate.isPending) return;
    setOpen(next);
    if (!next) {
      setPassword('');
      deactivate.reset();
    }
  };

  const finish = async () => {
    toast.success('Tu cuenta fue desactivada');
    // La API ya revocó la sesión: esta llamada recibe 401 y el cliente HTTP la
    // borra del navegador; logout() nunca falla para quien lo usa.
    await logout();
    navigate('/login', { replace: true });
  };

  const confirm = (event: MouseEvent) => {
    // El diálogo se queda abierto hasta que la API responda.
    event.preventDefault();
    if (!password || deactivate.isPending) return;
    deactivate.mutate(
      { password },
      {
        onSuccess: () => void finish(),
        onError: (error) => {
          // Ya estaba desactivada (dos pestañas a la vez): el resultado es el mismo.
          if (error instanceof ApiError && error.code === 'ALREADY_INACTIVE') {
            void finish();
          }
        },
      },
    );
  };

  return (
    <section>
      <h2 className={sectionTitle}>Desactivar cuenta</h2>
      <div className={card}>
        <p className="px-4 pt-4 text-[13px] text-[var(--muted)] leading-snug">
          Tu perfil, publicaciones e historias dejan de verse y no podrás
          iniciar sesión. Conservamos tu historial. Solo un administrador puede
          reactivar tu cuenta.
        </p>
        <AlertDialog open={open} onOpenChange={changeOpen}>
          <AlertDialogTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-[var(--tint)] transition-colors"
            >
              <UserX className="w-5 h-5 text-[var(--brand)]" />
              <span className="flex-1 text-[15px] font-semibold text-[var(--brand)]">
                Desactivar cuenta
              </span>
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Desactivar tu cuenta?</AlertDialogTitle>
              <AlertDialogDescription>
                Dejarás de aparecer en Cafeta y se cerrarán todas tus sesiones.
                Para confirmar, escribe tu contraseña.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div>
              <label
                htmlFor="deactivate-password"
                className="block text-[13px] font-semibold text-[var(--ink)] mb-1.5"
              >
                Tu contraseña
              </label>
              <input
                id="deactivate-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-[44px] px-3 rounded-[10px] text-[15px] text-[var(--ink)] bg-[var(--surface-3)] border-2 border-transparent outline-none focus:border-[var(--brand)]"
              />
              {deactivate.isError && (
                <p
                  role="alert"
                  className="mt-2 text-[13px] text-[var(--brand)] font-semibold"
                >
                  {userMessageOf(deactivate.error)}
                </p>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deactivate.isPending}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirm}
                disabled={!password || deactivate.isPending}
              >
                {deactivate.isPending ? 'Desactivando…' : 'Desactivar cuenta'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </section>
  );
}
