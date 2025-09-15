# Elo Arena — Next.js + Tailwind (Premium Minimal)

Run: npm install && cp .env.local.example .env.local && npm run dev

## Environment Variables

For production deployment (especially on Vercel), make sure to configure these environment variables:

- `ADMIN_PASSWORD` - Password for admin access
- `SUPER_ADMIN_PASSWORD` - Password for super admin access  
- `SESSION_SECRET` or `NEXTAUTH_SECRET` - Secret key for session signing (recommended for production)

**Important**: If `SESSION_SECRET`/`NEXTAUTH_SECRET` is not configured, the app will use a fallback secret. However, for production deployments, it's recommended to set a proper secret to ensure session security and consistency across deployments.
