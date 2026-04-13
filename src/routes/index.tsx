import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useLiveQuery } from "@tanstack/react-db"
import { documentsCollection } from "@/db/collections/documents"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { FilePlus, Trash2, FileText } from "lucide-react"
import { formatDistanceToNow } from "@/lib/format-date"

export const Route = createFileRoute("/")({
  ssr: false,
  component: HomePage,
})

function HomePage() {
  const navigate = useNavigate()

  const { data: documents } = useLiveQuery((q) =>
    q
      .from({ doc: documentsCollection })
      .orderBy(({ doc }) => doc.updated_at, "desc")
  )

  const handleCreate = async () => {
    const id = crypto.randomUUID()
    documentsCollection.insert({
      id,
      title: "Untitled",
      created_at: new Date(),
      updated_at: new Date(),
    })
    navigate({ to: "/doc/$id", params: { id } })
  }

  const handleDelete = (id: string) => {
    documentsCollection.delete(id)
  }

  return (
    <main className="flex-1">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Collaborative real-time editing
            </p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <FilePlus className="h-4 w-4" />
            New Document
          </Button>
        </div>

        {documents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium mb-2">No documents yet</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Create your first document to start collaborating.
              </p>
              <Button onClick={handleCreate} className="gap-2">
                <FilePlus className="h-4 w-4" />
                New Document
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {documents.map((doc) => (
              <Card
                key={doc.id}
                className="group cursor-pointer transition-colors hover:border-[#d0bcff]/30"
                onClick={() => navigate({ to: "/doc/$id", params: { id: doc.id } })}
              >
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium line-clamp-1">
                    {doc.title || "Untitled"}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(doc.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">
                    Updated {formatDistanceToNow(doc.updated_at)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
