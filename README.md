A real-time collaborative markdown editor built for teams. Think Google Docs collaboration, specifically for markdown. Multiple users can write and edit simultaneously with full conflict-free merging, see each other's cursors and selections live, and leave threaded comments anchored to specific text passages. Authenticates via Microsoft or Google accounts and works in any browser.

## Deploy on Railway

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/new/template/TEMPLATE_ID)

One-click deploy provisions three services: the Next.js app, a PostgreSQL database, and an Automerge sync server. You'll need OAuth credentials from at least one provider (Microsoft Entra ID or Google) — see [Authentication Setup](#authentication-setup) below.

**Required environment variables to set after deploying:**

| Variable                 | Description                                                       |
| ------------------------ | ----------------------------------------------------------------- |
| `NEXTAUTH_SECRET`        | Random secret — generate with `openssl rand -base64 32`           |
| `NEXTAUTH_URL`           | Your Railway app's public URL                                     |
| `AZURE_AD_CLIENT_ID`     | Azure app registration client ID _(if using Microsoft login)_     |
| `AZURE_AD_CLIENT_SECRET` | Azure app registration client secret _(if using Microsoft login)_ |
| `AZURE_AD_TENANT_ID`     | Azure tenant ID _(if using Microsoft login)_                      |
| `GOOGLE_CLIENT_ID`       | Google OAuth client ID _(if using Google login)_                  |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth client secret _(if using Google login)_              |

`DATABASE_URL` and `NEXT_PUBLIC_SYNC_SERVER_URL` are wired automatically between services.

## Features

- **Conflict-free real-time collaboration** — powered by [Automerge](https://automerge.org/), an industry-grade CRDT library, so edits from multiple users merge automatically without data loss
- **Live presence** — see who else is in the document, where their cursor is, and what text they're currently editing
- **Split editor/preview** — CodeMirror-powered editor with full markdown syntax support alongside a live-rendered preview (including GitHub Flavored Markdown, math via KaTeX, and Mermaid diagrams)
- **Inline review workflow** — leave threaded comments anchored to document positions, reply to colleagues, and resolve discussions
- **Document library** — manage and share multiple documents with per-user access control
- **SSO authentication** — sign in with Microsoft Entra ID or Google via NextAuth
- **Offline-friendly** — IndexedDB storage persists local edits and syncs on reconnect; BroadcastChannel enables tab-to-tab sync without a server round-trip

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
