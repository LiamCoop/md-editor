A real-time collaborative markdown editor built for teams — think Google Docs meets GitHub review workflows, but for markdown. Multiple users can write and edit simultaneously with full conflict-free merging, see each other's cursors and selections live, and leave threaded comments anchored to specific text passages. Authenticates via Microsoft or Google accounts and works in any browser.

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
