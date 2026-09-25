import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AppStateProvider } from './store/AppState';

function App() {
  return (
    <AppStateProvider>
      <RouterProvider router={router} />
    </AppStateProvider>
  );
}

export default App;
