// Dummy env vars so config/env.ts doesn't throw on import during unit tests —
// none of these connect to anything real; the tests here exercise pure logic
// only (JWT signing, QR signature verification, schedule generation) and
// never open a database connection.
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET ??= 'test_access_secret';
process.env.JWT_REFRESH_SECRET ??= 'test_refresh_secret';
process.env.QR_SIGNING_SECRET ??= 'test_qr_secret';
