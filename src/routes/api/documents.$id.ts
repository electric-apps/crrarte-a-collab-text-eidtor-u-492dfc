import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod/v4"
import { db } from "@/db"
import { documents } from "@/db/schema"
import { generateTxId } from "@/db/utils"
import { eq } from "drizzle-orm"

const patchSchema = z.object({
  title: z.string().min(1).max(500),
})

export const Route = createFileRoute("/api/documents/$id")({
  // @ts-expect-error — server.handlers types lag behind runtime support
  server: {
    handlers: {
      PATCH: async ({ request, params }: { request: Request; params: { id: string } }) => {
        const raw = await request.json()
        const parsed = patchSchema.safeParse(raw)
        if (!parsed.success) {
          return Response.json({ error: parsed.error.issues }, { status: 400 })
        }
        let txid: number
        const result = await db.transaction(async (tx) => {
          txid = await generateTxId(tx)
          const [row] = await tx
            .update(documents)
            .set({ ...parsed.data, updated_at: new Date() })
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
