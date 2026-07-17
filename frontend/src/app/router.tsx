import { lazy, Suspense, ReactNode } from 'react';
import { createBrowserRouter, Outlet } from 'react-router-dom';
import { ProtectedRoute } from '@/components/shared/ProtectedRoute';
import { AppShell } from '@/components/shared/AppShell';
import { RouteErrorBoundary } from '@/components/shared/RouteErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';

const LandingPage = lazy(() => import('@/features/landing/LandingPage'));
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'));
const CommandCenterPage = lazy(() => import('@/features/command-center/CommandCenterPage'));
const DigitalTwinPage = lazy(() => import('@/features/digital-twin/DigitalTwinPage'));
const TournamentsPage = lazy(() => import('@/features/tournaments/TournamentsPage'));
const TournamentDetailPage = lazy(() => import('@/features/tournaments/TournamentDetailPage'));
const TicketingPage = lazy(() => import('@/features/ticketing/TicketingPage'));
const MyTicketsPage = lazy(() => import('@/features/ticketing/MyTicketsPage'));
const ScannerPage = lazy(() => import('@/features/ticketing/ScannerPage'));
const CrowdIntelligencePage = lazy(() => import('@/features/crowd-intelligence/CrowdIntelligencePage'));
const ParkingPage = lazy(() => import('@/features/parking/ParkingPage'));
const FanExperiencePage = lazy(() => import('@/features/fan-experience/FanExperiencePage'));
const VendorManagementPage = lazy(() => import('@/features/vendor/VendorManagementPage'));
const SecurityCenterPage = lazy(() => import('@/features/security/SecurityCenterPage'));
const EmergencyResponsePage = lazy(() => import('@/features/emergency/EmergencyResponsePage'));
const AssetMaintenancePage = lazy(() => import('@/features/maintenance/AssetMaintenancePage'));
const SustainabilityPage = lazy(() => import('@/features/sustainability/SustainabilityPage'));
const ReportsPage = lazy(() => import('@/features/reports/ReportsPage'));
const NotificationCenterPage = lazy(() => import('@/features/notifications/NotificationCenterPage'));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

function PageFallback() {
  return (
    <div className="p-6">
      <Skeleton className="h-96 w-full" />
    </div>
  );
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>;
}

export const router = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/', element: withSuspense(<LandingPage />) },
      { path: '/login', element: withSuspense(<LoginPage />) },
      { path: '/register', element: withSuspense(<RegisterPage />) },
      { path: '/forgot-password', element: withSuspense(<ForgotPasswordPage />) },
      { path: '/reset-password', element: withSuspense(<ResetPasswordPage />) },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              { path: '/dashboard', element: withSuspense(<DashboardPage />) },
              { path: '/command-center', element: withSuspense(<CommandCenterPage />) },
              { path: '/digital-twin', element: withSuspense(<DigitalTwinPage />) },
              { path: '/tournaments', element: withSuspense(<TournamentsPage />) },
              { path: '/tournaments/:id', element: withSuspense(<TournamentDetailPage />) },
              { path: '/ticketing', element: withSuspense(<TicketingPage />) },
              { path: '/ticketing/my-tickets', element: withSuspense(<MyTicketsPage />) },
              { path: '/ticketing/scanner', element: withSuspense(<ScannerPage />) },
              { path: '/crowd-intelligence', element: withSuspense(<CrowdIntelligencePage />) },
              { path: '/parking', element: withSuspense(<ParkingPage />) },
              { path: '/fan-experience', element: withSuspense(<FanExperiencePage />) },
              { path: '/vendor', element: withSuspense(<VendorManagementPage />) },
              { path: '/security', element: withSuspense(<SecurityCenterPage />) },
              { path: '/emergency', element: withSuspense(<EmergencyResponsePage />) },
              { path: '/maintenance', element: withSuspense(<AssetMaintenancePage />) },
              { path: '/sustainability', element: withSuspense(<SustainabilityPage />) },
              { path: '/reports', element: withSuspense(<ReportsPage />) },
              { path: '/notifications', element: withSuspense(<NotificationCenterPage />) },
              { path: '/settings', element: withSuspense(<SettingsPage />) },
            ],
          },
        ],
      },
      { path: '*', element: withSuspense(<NotFoundPage />) },
    ],
  },
]);
