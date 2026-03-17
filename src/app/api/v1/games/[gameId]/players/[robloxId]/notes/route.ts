import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { authenticateApiRequest, apiError, apiSuccess, apiCreated, resolveGame, getPagination } from "@/lib/api-auth"

const AddNoteSchema = z.object({
  content: z.string().min(1).max(2000),
})

// GET /api/v1/games/:gameId/players/:robloxId/notes
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string; robloxId: string }> }
) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof NextResponse) return auth

  const { gameId, robloxId } = await params
  const game = await resolveGame(gameId, auth.org.id)
  if (!game) return apiError("NOT_FOUND", "Game not found in this workspace.", 404)

  const { page, limit, skip } = getPagination(req.nextUrl.searchParams)

  const [notes, total] = await Promise.all([
    prisma.playerNote.findMany({
      where: { gameId, robloxId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        authorId: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.playerNote.count({ where: { gameId, robloxId } }),
  ])

  return apiSuccess(
    notes.map((n) => ({
      id: n.id,
      content: n.content,
      author_id: n.authorId,
      created_at: n.createdAt,
    })),
    { page, limit, total, has_more: skip + notes.length < total }
  )
}

// POST /api/v1/games/:gameId/players/:robloxId/notes
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ gameId: string; robloxId: string }> }
) {
  const auth = await authenticateApiRequest(req)
  if (auth instanceof NextResponse) return auth

  const { gameId, robloxId } = await params
  const game = await resolveGame(gameId, auth.org.id)
  if (!game) return apiError("NOT_FOUND", "Game not found in this workspace.", 404)

  const body = await req.json().catch(() => ({}))
  const parsed = AddNoteSchema.safeParse(body)
  if (!parsed.success) {
    return apiError("BAD_REQUEST", parsed.error.issues[0]?.message ?? "Invalid input.", 400)
  }

  const note = await prisma.playerNote.create({
    data: {
      gameId,
      robloxId,
      content: parsed.data.content,
      authorId: auth.dbUser.id,
    },
  })

  return apiCreated({
    id: note.id,
    content: note.content,
    author_id: note.authorId,
    created_at: note.createdAt,
  })
}
