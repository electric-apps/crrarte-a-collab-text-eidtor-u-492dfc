import { createFileRoute, Link } from "@tanstack/react-router"
import { useState, useEffect, useRef, useCallback } from "react"
import { YjsProvider } from "@durable-streams/y-durable-streams"
import * as Y from "yjs"
import { Awareness } from "y-protocols/awareness"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Collaboration from "@tiptap/extension-collaboration"
import CollaborationCaret from "@tiptap/extension-collaboration-caret"
import { useLiveQuery, eq } from "@tanstack/react-db"
import { documentsCollection } from "@/db/collections/documents"
import { absoluteApiUrl } from "@/lib/client-url"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Users } from "lucide-react"

export const Route = createFileRoute("/doc/$id")({
  ssr: false,
  component: DocPage,
})

const COLORS = [
  "#d0bcff", "#998fe7", "#7e78db", "#75fbfd", "#ff8c3b",
  "#9ecbff", "#d29922", "#00d2a0",
]

function getRandomColor() {
  return COLORS[Math.floor(Math.random() * COLORS.length)]
}

function getOrCreateUser() {
  let name = localStorage.getItem("userName")
  let color = localStorage.getItem("userColor")
  if (!name) {
    name = `User ${Math.floor(Math.random() * 9999)}`
    localStorage.setItem("userName", name)
  }
  if (!color) {
    color = getRandomColor()
    localStorage.setItem("userColor", color)
  }
  return { name, color }
}

function DocPage() {
  const { id: docId } = Route.useParams()
  return <CollabEditor key={docId} docId={docId} />
}

function CollabEditor({ docId }: { docId: string }) {
  const user = getOrCreateUser()

  const [{ doc, awareness }] = useState(() => {
    const d = new Y.Doc()
    const aw = new Awareness(d)
    aw.setLocalState({ user })
    return { doc: d, awareness: aw }
  })

  const [provider, setProvider] = useState<YjsProvider | null>(null)
  const [synced, setSynced] = useState(false)
  const [awarenessStates, setAwarenessStates] = useState<Map<number, Record<string, unknown>>>(new Map())
  const [title, setTitle] = useState("Untitled")
  const [titleInitialized, setTitleInitialized] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  // Load title reactively from the documents collection
  const { data: docs } = useLiveQuery((q) =>
    q.from({ doc: documentsCollection }).where(({ doc }) => eq(doc.id, docId))
  )
  useEffect(() => {
    if (docs[0]?.title && !titleInitialized) {
      setTitle(docs[0].title)
      setTitleInitialized(true)
    }
  }, [docs, titleInitialized])

  useEffect(() => {
    if (awareness.getLocalState() === null) {
      awareness.setLocalState({ user })
    }

    const p = new YjsProvider({
      doc,
      baseUrl: absoluteApiUrl("/api/yjs"),
      docId,
      awareness,
      connect: false,
    })

    p.on("synced", (s: boolean) => {
      if (s) setSynced(true)
    })
    p.on("error", (err: Error) => {
      console.error("[YjsProvider] error:", err)
    })

    setProvider(p)
    p.connect()

    return () => {
      p.destroy()
      setProvider(null)
    }
  }, [doc, awareness, docId])

  useEffect(() => {
    return () => {
      awareness.destroy()
      doc.destroy()
    }
  }, [doc, awareness])

  // Track awareness states for presence bar
  useEffect(() => {
    const handleChange = () => {
      setAwarenessStates(new Map(awareness.getStates()))
    }
    awareness.on("change", handleChange)
    handleChange()
    return () => {
      awareness.off("change", handleChange)
    }
  }, [awareness])

  const handleTitleBlur = useCallback(() => {
    if (title.trim()) {
      fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      }).catch(() => {})
    }
  }, [docId, title])

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault()
        titleRef.current?.blur()
      }
    },
    []
  )

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: doc }),
        ...(provider
          ? [
              CollaborationCaret.configure({
                provider,
                user,
              }),
            ]
          : []),
      ],
      editorProps: {
        attributes: {
          class:
            "prose prose-invert max-w-none min-h-[60vh] focus:outline-none px-1 py-2",
        },
      },
    },
    [provider]
  )

  const otherUsers = Array.from(awarenessStates.entries())
    .filter(([clientId]) => clientId !== doc.clientID)
    .map(([, state]) => state.user as { name: string; color: string } | undefined)
    .filter(Boolean)

  return (
    <main className="flex-1">
      <div className="border-b border-[#2a2c34] sticky top-0 bg-[#161618] z-10">
        <div className="container mx-auto max-w-4xl px-4 h-14 flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            className="bg-transparent text-lg font-medium flex-1 outline-none border-none placeholder:text-muted-foreground"
            placeholder="Untitled"
          />
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="flex -space-x-2">
              {/* Current user */}
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#161618]"
                style={{ backgroundColor: user.color, color: "#1b1b1f" }}
                title={`${user.name} (you)`}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              {otherUsers.map((u, i) => (
                <div
                  key={i}
                  className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium border-2 border-[#161618]"
                  style={{ backgroundColor: u!.color, color: "#1b1b1f" }}
                  title={u!.name}
                >
                  {u!.name.charAt(0).toUpperCase()}
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {otherUsers.length + 1} online
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        {!synced ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : (
          <EditorContent editor={editor} />
        )}
      </div>
    </main>
  )
}
