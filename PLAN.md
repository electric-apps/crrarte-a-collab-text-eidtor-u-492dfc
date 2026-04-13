# PLAN.md — Collaborative Text Editor

## App Description

A real-time collaborative rich-text editor where multiple users can concurrently edit documents using Yjs CRDTs over Durable Streams. Documents are managed via Electric SQL + TanStack DB; concurrent edits are synced via `@durable-streams/y-durable-streams`; user presence and cursor positions are handled through Yjs Awareness.

---

## User Flows

### 1. Document Dashboard (`/`)
1. User lands on the home page and sees a list of all documents (title, created date).
2. User clicks **New Document** → a document is created in Postgres with a default title and the user is navigated to the editor.
3. User clicks a document card → navigated to `/doc/$id`.
4. User clicks the delete icon on a document card → document is deleted (with confirmation).

### 2. Collaborative Editor (`/doc/$id`)
1. Editor page loads the document metadata (title) from the synced Electric collection.
2. TipTap editor initialises with the Yjs collaboration extension, backed by a Y.Doc connected to `@durable-streams/y-durable-streams`.
3. As the user types, changes are broadcast to all other connected clients via the Durable Stream in real time.
4. A presence bar at the top of the editor shows avatars/names for all currently connected users.
5. Each user's cursor and text selection is visible to others via Yjs Awareness (colored cursor labels).
6. The document title is editable inline; saving the title sends a PATCH request to the server and updates Postgres.

---

## Data Model

```ts
// src/db/schema.ts

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull().default("Untitled"),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
```

> No additional tables are needed. Document content lives entirely inside the Yjs CRDT (persisted by the Durable Stream), not in Postgres.

---

## Key Technical Decisions

| Problem | Product | Package |
|---|---|---|
| Document list — current state, live-synced | Electric SQL shapes + TanStack DB | `@electric-sql/client` + `@tanstack/db` + `@tanstack/react-db` |
| Document schema + migrations | Drizzle ORM | `drizzle-orm` + `drizzle-kit` |
| Concurrent rich-text editing with CRDT conflict resolution | Y-Durable-Streams | `@durable-streams/y-durable-streams` |
| Presence: cursors, selections, who's online | Yjs Awareness (bundled with the Yjs provider) | `@durable-streams/y-durable-streams` |
| Full-stack routing + API routes | TanStack Start | `@tanstack/react-start` |
| UI components | shadcn/ui + Tailwind CSS | `@/components/ui/*` + `tailwindcss` |

**Why not StreamDB for presence?** The collaborative-document pattern uses Yjs Awareness (piggybacked on the same Yjs stream) rather than a separate StreamDB instance — fewer services to provision, and Awareness is purpose-built for editor presence.

**Why not Electric shapes for document content?** Rich-text concurrent editing is a CRDT problem, not a CRUD problem. Electric shapes don't merge concurrent edits; Yjs does.

> **Credential requirement:** Before the first stream operation, the coder must follow the Electric CLI flow in the `room-messaging` skill and store the resulting Yjs service URL + secret via `set_secret`.

---

## Implementation Tasks

### Phase 1: Schema & Migrations
- [ ] Define `documents` table in `src/db/schema.ts` using Drizzle (UUID PK, title, timestamps)
- [ ] Generate migration with `drizzle-kit generate` and apply it

### Phase 2: API Routes (server-side)
- [ ] `POST /api/documents` — insert a new document row, return the created record
- [ ] `DELETE /api/documents/:id` — delete document by id (cascade safe — no child rows)
- [ ] `PATCH /api/documents/:id` — update document title, set `updated_at`
- [ ] `GET /api/shape/documents` — Electric shape proxy for the documents table

### Phase 3: Yjs Service Proxy
- [ ] Add a server-side proxy route (e.g. `GET/POST /api/yjs/$docId`) that forwards requests to the Durable Streams Yjs service, injecting the `Authorization: Bearer <secret>` header
- [ ] Follow the Yjs proxy header block-list rules from the `create-app` skill (forward `stream-next-offset`; strip `content-encoding`)

### Phase 4: Document Dashboard Page (`src/routes/index.tsx`)
- [ ] Set `ssr: false` or wrap the live-query consumer in `<ClientOnly>` since TanStack DB live queries don't run server-side
- [ ] Define a TanStack DB `documents` collection backed by the `/api/shape/documents` proxy (use `z.coerce.date()` in the schema and a `timestamptz` parser for `created_at` / `updated_at`)
- [ ] Use a live-query hook to render the document list, sorted by `updated_at` descending
- [ ] **New Document** button — calls `POST /api/documents` optimistically, then navigates to the new doc's editor
- [ ] Document card with title, relative timestamp, and a delete button (calls `DELETE /api/documents/:id` with an optimistic remove)
- [ ] Empty state when there are no documents

### Phase 5: Collaborative Editor Page (`src/routes/doc.$id.tsx`)
- [ ] Set `ssr: false` on the route — TipTap, Yjs providers, and live queries all require a browser context
- [ ] Wire up `@durable-streams/y-durable-streams` to provide the Y.Doc for this document (keyed by `docId`)
- [ ] Install and configure TipTap with the collaboration extension (uses the shared Y.Doc) and the collaboration-cursor extension (uses Yjs Awareness)
- [ ] Assign each connecting user a random display name and color for their Awareness entry
- [ ] Presence bar component: reads Awareness state, renders an avatar chip per connected user with their name and color
- [ ] Inline-editable title: rendered as a heading above the editor; on blur/enter, fires `PATCH /api/documents/:id` and updates the TanStack DB collection optimistically
- [ ] Loading skeleton shown while the Yjs provider is connecting

### Phase 6: Styling & Polish
- [ ] Apply Electric brand design system (colors, typography) per `.claude/skills/design-styles/electric/DESIGN.md`
- [ ] Responsive layout: dashboard uses a card grid; editor uses a centered max-width column
- [ ] Use `lucide-react` icons throughout (e.g. `FilePlus`, `Trash2`, `Users`)
- [ ] Write `README.md` documenting setup, env vars, and how to run the app
