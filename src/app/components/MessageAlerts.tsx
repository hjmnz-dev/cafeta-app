import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { messageAlert } from '../lib/notifications';
import { useNotificationListener } from '../store/RealtimeProvider';

/**
 * HU35 · Bug 1024: un mensaje que llega con la sesión abierta avisa con un
 * aviso emergente que lleva a la conversación. Escucha el mismo aviso
 * `notification:new` de la API, así que respeta la preferencia de "Mensajes"
 * en notificaciones: si está apagada, la API no lo manda. No dibuja nada propio.
 */
export function MessageAlerts() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  useNotificationListener((notification) => {
    const alert = messageAlert(notification, pathname);
    if (!alert) return;
    toast(alert.text, {
      id: `mensaje-${notification.id}`,
      action: { label: 'Ver', onClick: () => navigate(alert.link) },
    });
  });

  return null;
}
