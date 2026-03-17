import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  const checks: Record<string, { status: "ok" | "error"; latencyMs: number; message?: string }> = {}

  // Database
  const dbStart = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = { status: "ok", latencyMs: Date.now() - dbStart }
  } catch (err) {
    checks.database = {
      status: "error",
      latencyMs: Date.now() - dbStart,
      message: err instanceof Error ? err.message : "Unknown error",
    }
  }

  const allOk = Object.values(checks).every((c) => c.status === "ok")

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? "0.1.0",
      checks,
    },
    { status: allOk ? 200 : 503 }
  )
}
