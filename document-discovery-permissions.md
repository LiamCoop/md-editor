# Add Database for Document Discovery & Permissions

## Context

Currently, users can only discover documents by having someone share an Automerge URL with them. Each user's document list is stored in a per-user Automerge index document tracked via localStorage. This is fragile (browser-specific, no cross-device sync) and doesn't support access control — anyone with an Automerge URL can open any document.

This change adds a PostgreSQL database (via Prisma) to track document metadata and permissions. Document **content** remains entirely in Automerge CRDTs. The database only knows *that* documents exist, *who* owns them, and *who* can access them.

**Key constraint**: Automerge relies on IndexedDB for document storage and localStorage for repo state. We are NOT removing those. We are only replacing the document *discovery/listing* mechanism (`useDocumentIndex` hook) with database-backed queries on the `/editor` page.

---

## Schema

Three tables:

**User** — synced from NextAuth session on first DB access
- `id` (cuid, PK), `authProvider`, `authUserId`, `email`, `name`, `image`, `createdAt`, `updatedAt`
- Unique constraint: `(authProvider, authUserId)`

**Document** — metadata only
- `id` (cuid, PK), `automergeIdentifier` (String, unique), `title`, `visibility` (enum: `PRIVATE` | `LINK`), `ownerId` (FK → User), `createdAt`, `updatedAt`
- Default visibility: `PRIVATE`

**DocumentMember** — explicit access grants
- `id` (cuid, PK), `documentId` (FK → Document, cascade delete), `userId` (FK → User), `createdAt`
- Unique constraint: `(documentId, userId)`
- Simple model: membership = edit access. No role enum needed.

**Permission logic**:
- Owner (via `Document.ownerId`): full control (edit, share, delete, change visibility)
- Member (via `DocumentMember`): can edit content
- `PRIVATE` docs: only owner + explicit members can access
- `LINK` docs: any authenticated user with the URL can access

---

## Implementation Steps

### 1. Infrastructure setup
- Add `postgres` service to `docker-compose.yml` (postgres:16-alpine, port 5432, volume `pg-data`)
- `npm install prisma --save-dev && npm install @prisma/client`
- `npx prisma init` → creates `prisma/schema.prisma` and updates `.env`
- Write schema with User, Document, DocumentMember tables
- Add `DATABASE_URL` to `.env.example`
- Run `npx prisma migrate dev --name init`

**Files**: `docker-compose.yml`, `package.json`, `prisma/schema.prisma`, `.env`, `.env.example`

### 2. DB utilities
- `lib/db.ts` — Prisma singleton (standard Next.js pattern, cache on `globalThis`)
- `lib/auth-helpers.ts` — `getOrCreateUser(session)` upserts User from NextAuth session

**Files**: `lib/db.ts` (new), `lib/auth-helpers.ts` (new)

### 3. Server actions for document + permission CRUD
- `app/editor/actions.ts` with `"use server"` directive
- `registerDocument(automergeId, title)` — creates Document with caller as owner, visibility PRIVATE
- `listMyDocuments()` — docs where user is owner OR member, ordered by updatedAt desc
- `updateDocumentTitle(documentId, title)` — owner or member
- `deleteDocument(documentId)` — owner only
- `updateDocumentVisibility(documentId, visibility)` — owner only
- `addDocumentMember(documentId, email)` — owner only, looks up user by email
- `removeDocumentMember(documentId, memberId)` — owner only
- `listDocumentMembers(documentId)` — for sharing UI
- `checkDocumentAccess(automergeId, userId)` — internal helper, returns `{ allowed, role }`

**Files**: `app/editor/actions.ts` (new)

### 4. Refactor document listing (`/editor` page)
- `app/editor/page.tsx`: call `listMyDocuments()` and pass results as prop to DocumentLibrary
- `app/editor/DocumentLibrary.tsx`:
  - Accept `documents` prop (from DB) instead of loading from Automerge index
  - Remove: `indexStorageKey`, `indexUrl` state, `useDocument<DocumentIndexDoc>`, `useDocuments<MarkdownDoc>` for bulk title loading, `changeIndexDoc`
  - Keep: `useRepo()` for creating new Automerge docs
  - Document creation: `repo.create()` → call `registerDocument()` server action → `router.push()` + `router.refresh()`
  - "Go to document" (paste URL): navigate directly, access check happens in `[docId]/page.tsx`

**Files**: `app/editor/page.tsx`, `app/editor/DocumentLibrary.tsx`

### 5. Access control on document editor page
- `app/editor/[docId]/page.tsx`: after auth check, call `checkDocumentAccess()`
  - If no DB record exists and user is navigating via shared URL → show "document not found or no access"
  - If `LINK` visibility and user isn't a member → allow access (optionally auto-add as member so it shows in their doc list)
  - If `PRIVATE` and user is neither owner nor member → deny access

**Files**: `app/editor/[docId]/page.tsx`

### 6. Remove `useDocumentIndex` from EditorShell
- `app/editor/EditorShell.tsx`: remove the `useDocumentIndex` call (it auto-added docs to the localStorage index; no longer needed since DB handles discovery)
- Keep `useDocumentIndex.ts` file for now — it may still be useful during migration period, delete after migration is stable

**Files**: `app/editor/EditorShell.tsx`

### 7. Title sync
- In `EditorShell.tsx` or `EditorHeader.tsx`: when the user edits the document title, debounce and call `updateDocumentTitle()` server action to keep the DB in sync
- The title in the Automerge CRDT remains the source of truth for the live editor; the DB title is for the document list

**Files**: `app/editor/EditorHeader.tsx` or `app/editor/EditorShell.tsx`

### 8. Sharing UI
- New component: `app/editor/ShareDialog.tsx`
  - Accessible from EditorHeader (add "Share" button, owner-only)
  - Toggle visibility: Private ↔ Anyone with link
  - List current members with remove button
  - "Add people" input (by email)
  - All actions call server actions
- Wire into `EditorHeader.tsx`

**Files**: `app/editor/ShareDialog.tsx` (new), `app/editor/EditorHeader.tsx`

### 9. localStorage migration
- One-time migration in `DocumentLibrary.tsx` via `useEffect`:
  1. Check for existing localStorage index key
  2. Load Automerge index doc, extract entries
  3. Call bulk server action `migrateDocumentsFromLocalStorage(entries)` — upserts, skips duplicates
  4. Set migration-complete flag in localStorage
- Non-destructive: old Automerge index stays in IndexedDB, just stops being read for discovery

**Files**: `app/editor/DocumentLibrary.tsx`, `app/editor/actions.ts`

### 10. Build script & deployment
- Update `package.json` build script: `"build": "prisma generate && prisma migrate deploy && next build"`
- On Railway: provision PostgreSQL, `DATABASE_URL` auto-injected

**Files**: `package.json`

---

## Verification

1. **Local dev**: `docker compose up` starts both postgres and sync-server. `npm run dev` connects to both.
2. **Create document**: Click "Add Document" → document appears in list (from DB) and opens in editor
3. **Private by default**: Open a second browser/incognito, sign in as different user → new user cannot see the first user's documents in their list
4. **Share via URL**: First user changes visibility to "Link" → second user pastes the Automerge URL → can access and edit
5. **Share by email**: First user adds second user's email in Share dialog → document appears in second user's doc list
6. **Title sync**: Edit title in editor → navigate back to doc list → title is updated
7. **Migration**: User with existing localStorage index → documents appear in DB-backed list after first load
