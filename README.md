This is a Next.js collaborative markdown editor backed by Automerge and NextAuth.

## Authentication Setup

Copy [`.env.example`](/Users/lco/personal/md-editor/.env.example) to `.env` and fill in the credentials for the providers you want to enable.

### Microsoft Entra ID

Set:

- `AZURE_AD_CLIENT_ID`
- `AZURE_AD_CLIENT_SECRET`
- `AZURE_AD_TENANT_ID`

Register these callback URLs in Azure:

```text
http://localhost:3000/api/auth/callback/azure-ad
https://<your-domain>/api/auth/callback/azure-ad
```

### Google / Gmail

Set:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

Create an OAuth client in Google Cloud Console and register these redirect URIs:

```text
http://localhost:3000/api/auth/callback/google
https://<your-domain>/api/auth/callback/google
```

### Shared NextAuth Settings

Set:

- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`

## Getting Started

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).
