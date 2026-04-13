import { createFileRoute } from "@tanstack/react-router"
import { db } from "@/db"
import { documents } from "@/db/schema"
import { parseDates, generateTxId } from "@/db/utils"
import { eq } from "drizzle-orm"

export const Route = createFileRoute("/api/documents/$id")({
  // @ts-expect-error — server.handlers types lag behind runtime support
  server: {
    handlers: {
      PATCH: async ({ request, params }: { request: Request; params: { id: string } }) => {
        const body = parseDates(await request.json())
        const { created_at, updated_at, ...data } = body
        let txid: number
        const result = await db.transaction(async (tx) => {
          txid = await generateTxId(tx)
          const [row] = await tx
            .update(documents)
            .set({ ...data, updated_at: new Date() })
            .where(eq(documents.id, params.id))
            .returning()
          return row
        })
        return Response.json({ ...result, txid: txid! })
      },
      DELETE: async ({ params }: { params: { id: string } }) => {
        let txid: number
        await db.transaction(async (tx) => {
          txid = await generateTxId(tx)
          await tx.delete(documents).where(eq(documents.id, params.id))
        })
        return Response.json({ txid: txid! })
      },
    },
  },
})
