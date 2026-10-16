import { useParams } from 'react-router';
import { isApiUserId } from '../lib/profiles';
import {
  LiveUserProfileScreen,
  MissingUserProfileScreen,
} from './LiveUserProfileScreen';

/**
 * Perfil de otro usuario. Ruta: /u/:userId. Siempre es el perfil real de la
 * API con su privacidad (decisión 15); un id que no es de la API (los de la
 * demo que ya no existe) no corresponde a nadie.
 */
export function UserProfileScreen() {
  const { userId = '' } = useParams();
  return isApiUserId(userId) ? (
    <LiveUserProfileScreen key={userId} userId={userId} />
  ) : (
    <MissingUserProfileScreen />
  );
}
