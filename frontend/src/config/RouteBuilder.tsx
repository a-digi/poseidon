import Dashboard from '../components/Dashboard';
import Plugin from '../components/Plugin';
import Settings from '../components/Settings';

export function getInitialRoutes() {
  return [
    {
      path: '/',
      element: <Dashboard />,
    },
    {
      path: '/plugins',
      element: <Plugin />,
    },
    {
      path: '/settings',
      element: <Settings />,
    },
  ];
}
