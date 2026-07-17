import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  Activity,
  Building2,
  Trophy,
  Ticket,
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
  Loader2,
  Map,
  ParkingSquare,
  Siren,
  Wrench,
  Leaf,
  BarChart3,
  Bell,
  Settings as SettingsIcon,
  Store,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { extractErrorMessage } from '@/services/api';

const MODULES = [
  { icon: BarChart3, label: 'Executive Dashboard' },
  { icon: Map, label: 'Stadium Digital Twin' },
  { icon: Trophy, label: 'Tournament Management' },
  { icon: Ticket, label: 'Smart Ticketing' },
  { icon: Activity, label: 'Crowd Intelligence' },
  { icon: ParkingSquare, label: 'Smart Parking' },
  { icon: Sparkles, label: 'Fan Experience' },
  { icon: Store, label: 'Vendor Management' },
  { icon: ShieldCheck, label: 'Security Center' },
  { icon: Siren, label: 'Emergency Response' },
  { icon: Wrench, label: 'Asset & Maintenance' },
  { icon: Leaf, label: 'Sustainability' },
  { icon: BarChart3, label: 'Reports & Analytics' },
  { icon: Bell, label: 'Notification Center' },
  { icon: SettingsIcon, label: 'Settings' },
  { icon: Users, label: '10-Role RBAC' },
];

const DEMO_EMAIL = 'stadiumadmin@stadiumos.dev';
const DEMO_PASSWORD = 'Password123!';

export default function LandingPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [isLaunching, setIsLaunching] = useState(false);

  const launchLiveDemo = async () => {
    setIsLaunching(true);
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
      navigate('/command-center');
      toast.success('Live demo launched — you are signed in as a Stadium Admin.');
    } catch (err) {
      toast.error(extractErrorMessage(err));
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-base font-semibold">Smart Stadium OS</span>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm">
              <Link to="/dashboard">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/register">Get started</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <section className="relative px-6 pb-20 pt-10 sm:px-10 sm:pt-16">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_top,_hsl(var(--primary)/0.18),_transparent_65%)]" />

        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
            </span>
            Live demo running on simulated real-time data
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl"
          >
            The AI-powered intelligent stadium
            <br className="hidden sm:block" /> and tournament operations platform.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground"
          >
            One platform for command-center operations, a live digital twin, tournament
            scheduling, and smart ticketing — built to run FIFA World Cup, IPL, and Olympic-scale
            events.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Button size="lg" onClick={launchLiveDemo} disabled={isLaunching}>
              {isLaunching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              Launch Live Demo
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/register">Create an account</Link>
            </Button>
          </motion.div>
          <p className="mt-3 text-xs text-muted-foreground">
            No signup needed — instantly explore as a Stadium Admin with live simulated data.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="mx-auto mt-16 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {MODULES.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.3 + i * 0.03 }}
            >
              <Card className="h-full">
                <CardContent className="flex flex-col items-center gap-2 p-4 text-center">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <m.icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs font-medium leading-tight">{m.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <section className="border-t border-border bg-card/40 px-6 py-16 sm:px-10">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              icon: Activity,
              title: 'Live Digital Twin',
              body: 'Pan and zoom an interactive stadium map with real-time crowd heatmaps, gate status, parking, and equipment health.',
            },
            {
              icon: Sparkles,
              title: 'AI Operational Insights',
              body: 'A rule-based recommendation engine reads live conditions and surfaces actionable calls — congestion, capacity, weather risk.',
            },
            {
              icon: ShieldCheck,
              title: 'Enterprise RBAC',
              body: '10 built-in roles from Super Admin to Fan, each with a tailored view across every operational module.',
            },
          ].map((f) => (
            <div key={f.title} className="space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 py-8 text-center text-xs text-muted-foreground sm:px-10">
        &copy; {new Date().getFullYear()} Smart Stadium Corp. Preview build — payments and AI features are simulated.
      </footer>
    </div>
  );
}
