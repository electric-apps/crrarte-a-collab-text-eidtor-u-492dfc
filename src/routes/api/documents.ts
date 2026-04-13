import { createFileRoute } from "@tanstack/react-router"
import { proxyElectricRequest } from "@/lib/electric-proxy"
import { db } from "@/db"
import { documents } from "@/db/schema"
import { generateTxId } from "@/db/utils"
import { documentInsertSchema } from "@/db/zod-schemas"

export const Route = createFileRoute("/api/documents")({
  // @ts-expect-error — server.handlers types lag behind runtime support
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) =>
        proxyElectricRequest(request, "documents"),
      POST: async ({ request }: { request: Request }) => {
        const raw = await request.json()
        const parsed = documentInsertSchema.pick({ id: true, title: true }).safeParse(raw)
        if (!parsed.success) {
          return Response.json({ error: parsed.error.issues }, { status: 400 })
        }
        let txid: number
        const result = await db.transaction(async (tx) => {
          txid = await generateTxId(tx)
          const [row] = await tx.insert(documents).values(parsed.data).returning()
          return row
        })
        return Response.json({ ...result, txid: txid! })
      },
    },
  },
})
