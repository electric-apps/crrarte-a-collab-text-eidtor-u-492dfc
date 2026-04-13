import { createCollection } from "@tanstack/react-db"
import { electricCollectionOptions } from "@tanstack/electric-db-collection"
import { documentSelectSchema } from "@/db/zod-schemas"
import { absoluteApiUrl } from "@/lib/client-url"

export const documentsCollection = createCollection(
  electricCollectionOptions({
    id: "documents",
    schema: documentSelectSchema,
    getKey: (row) => row.id,
    shapeOptions: {
      url: absoluteApiUrl("/api/documents"),
      parser: {
        timestamptz: (date: string) => new Date(date),
      },
    },
    onInsert: async ({ transaction }) => {
      const { modified: newDoc } = transaction.mutations[0]
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDoc),
      })
      const data = await res.json()
      return { txid: data.txid }
    },
    onUpdate: async ({ transaction }) => {
      const { modified: updated } = transaction.mutations[0]
      const res = await fetch(`/api/documents/${updated.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: updated.title }),
      })
      const data = await res.json()
      return { txid: data.txid }
    },
    onDelete: async ({ transaction }) => {
      const { original: deleted } = transaction.mutations[0]
      const res = await fetch(`/api/documents/${deleted.id}`, {
        method: "DELETE",
      })
      const data = await res.json()
      return { txid: data.txid }
    },
  })
)
