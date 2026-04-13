import { createFileRoute } from "@tanstack/react-router"
import { proxyElectricRequest } from "@/lib/electric-proxy"
import { db } from "@/db"
import { documents } from "@/db/schema"
import { parseDates, generateTxId } from "@/db/utils"

export const Route = createFileRoute("/api/documents")({
  // @ts-expect-error — server.handlers types lag behind runtime support
  server: {
    handlers: {
      GET: ({ request }: { request: Request }) =>
        proxyElectricRequest(request, "documents"),
      POST: async ({ request }: { request: Request }) => {
        const body = parseDates(await request.json())
        const { created_at, updated_at, ...data } = body
        let txid: number
        const result = await db.transaction(async (tx) => {
          txid = await generateTxId(tx)
          const [row] = await tx.insert(documents).values(data).returning()
          return row
        })
        return Response.json({ ...result, txid: txid! })
      },
    },
  },
})
