import dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Like required(), but the dev fallback is only honored outside production —
 * in production a missing secret fails startup instead of silently signing
 * tokens with a well-known placeholder value.
 */
function requiredSecret(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (isProd) {
    throw new Error(`Missing required environment variable: ${name} (no dev fallback allowed in production)`);
  }
  return devFallback;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd,
  port: Number(process.env.PORT ?? 5000),
  clientUrl: process.env.CLIENT_URL ?? 'http://localhost:5173',

  databaseUrl: required('DATABASE_URL'),

  jwt: {
    accessSecret: requiredSecret('JWT_ACCESS_SECRET', 'dev_access_secret'),
    refreshSecret: requiredSecret('JWT_REFRESH_SECRET', 'dev_refresh_secret'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  passwordResetExpiresMin: Number(process.env.PASSWORD_RESET_EXPIRES_MIN ?? 30),

  qrSigningSecret: requiredSecret('QR_SIGNING_SECRET', 'dev_qr_secret'),

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? '',
    apiKey: process.env.CLOUDINARY_API_KEY ?? '',
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? '',
    get configured() {
      return Boolean(this.cloudName && this.apiKey && this.apiSecret);
    },
  },

  smtp: {
    host: process.env.SMTP_HOST ?? '',
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    from: process.env.SMTP_FROM ?? 'Smart Stadium OS <no-reply@stadiumos.dev>',
    get configured() {
      return Boolean(this.host && this.user && this.pass);
    },
  },

  // Default raised from 6s to 20s — the simulator's frequent small writes were
  // a major contributor to burning through Neon's free-tier monthly network
  // transfer allowance during heavy testing. 20s still feels "live" in the UI.
  simulatorIntervalMs: Number(process.env.SIMULATOR_INTERVAL_MS ?? 20000),
};
