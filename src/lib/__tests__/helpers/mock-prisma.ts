import { vi } from "vitest"

export function createMockPrisma() {
  const mockTx = {
    gameLog: { create: vi.fn() },
    liveServer: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    trackedPlayer: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    sanction: {
      create: vi.fn().mockResolvedValue({
        id: "sanction-1",
        type: "BAN",
        reason: "Exploiting",
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
        moderator: "TestMod",
        deliveryStatus: "PENDING",
        deliveredAt: null,
        deliveryDetails: null,
      }),
      findFirst: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn(),
    },
  }

  const prisma = {
    game: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    gameLog: { create: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    trackedPlayer: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    liveServer: {
      upsert: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    sanction: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn((fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx)),
  }

  return { prisma, mockTx }
}
