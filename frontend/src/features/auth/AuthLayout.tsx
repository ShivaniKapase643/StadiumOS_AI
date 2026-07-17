import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Building2, Activity, ShieldCheck, Trophy } from 'lucide-react';

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.15),_transparent_60%)]" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15">
            <Building2 className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">Smart Stadium OS</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 space-y-6"
        >
          <h1 className="text-4xl font-semibold leading-tight">
            The AI-powered intelligent stadium and tournament operations platform.
          </h1>
          <p className="max-w-md text-primary-foreground/80">
            Real-time digital twin, tournament management, and smart ticketing — built for FIFA-scale events.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-4">
            {[
              { icon: Activity, label: 'Live Digital Twin' },
              { icon: Trophy, label: 'Tournament Ops' },
              { icon: ShieldCheck, label: 'Enterprise RBAC' },
            ].map((f) => (
              <div key={f.label} className="rounded-lg bg-white/10 p-3">
                <f.icon className="mb-2 h-5 w-5" />
                <p className="text-xs font-medium">{f.label}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <p className="relative z-10 text-xs text-primary-foreground/60">
          &copy; {new Date().getFullYear()} Smart Stadium Corp. All 16 modules live &middot; payments &amp; AI are simulated.
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm space-y-6"
        >
          <div className="space-y-1 text-center lg:text-left">
            <h2 className="text-2xl font-semibold">{title}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
          {children}
        </motion.div>
      </div>
    </div>
  );
}
