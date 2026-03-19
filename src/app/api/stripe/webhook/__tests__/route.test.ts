import { describe, it, expect, vi, beforeEach } from "vitest"

const mockConstructEvent = vi.fn()
const mockSyncSubscription = vi.fn().mockResolvedValue(undefined)
const mockSendTrialEmail = vi.fn().mockResolvedValue(undefined)
const mockSendPaymentEmail = vi.fn().mockResolvedValue(undefined)

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: mockConstructEvent },
  },
}))
vi.mock("@/lib/billing", () => ({
  syncSubscriptionFromStripe: mockSyncSubscription,
}))
vi.mock("@/lib/email", () => ({
  sendTrialExpiryEmail: mockSendTrialEmail,
  sendPaymentFailedEmail: mockSendPaymentEmail,
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn().mockResolvedValue({
        user: { email: "test@example.com", name: "TestUser" },
      }),
    },
  },
}))
vi.mock("@/lib/env.server", () => ({
  env: {
    DATABASE_URL: "postgresql://test",
    STRIPE_SECRET_KEY: "sk_test_x",
    STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
    STRIPE_PRICE_PRO: "price_pro",
    STRIPE_PRICE_STUDIO: "price_studio",
    CLERK_SECRET_KEY: "sk_test_x",
    NODE_ENV: "test",
  },
}))
vi.mock("stripe", () => ({ default: class Stripe {} }))

const { POST } = await import("../route")

function makeRequest(body: string, headers: Record<string, string> = {}) {
  return new Request("https://test.com/api/stripe/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  }) as unknown as import("next/server").NextRequest
}

describe("POST /api/stripe/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns 400 if stripe-signature header is missing", async () => {
    const res = await POST(makeRequest("{}"))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain("Missing")
  })

  it("returns 400 if constructEvent throws", async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Invalid signature")
    })

    const res = await POST(
      makeRequest("{}", { "stripe-signature": "bad-sig" })
    )
    expect(res.status).toBe(400)
  })

  it("calls syncSubscriptionFromStripe on subscription.created", async () => {
    const mockSub = { id: "sub_1", customer: "cus_1" }
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.created",
      data: { object: mockSub },
    })

    const res = await POST(
      makeRequest("{}", { "stripe-signature": "valid-sig" })
    )
    expect(res.status).toBe(200)
    expect(mockSyncSubscription).toHaveBeenCalledWith(mockSub)
  })

  it("calls syncSubscriptionFromStripe on subscription.updated", async () => {
    const mockSub = { id: "sub_1", customer: "cus_1" }
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.updated",
      data: { object: mockSub },
    })

    await POST(makeRequest("{}", { "stripe-signature": "valid-sig" }))
    expect(mockSyncSubscription).toHaveBeenCalledWith(mockSub)
  })

  it("calls syncSubscriptionFromStripe on subscription.deleted", async () => {
    const mockSub = { id: "sub_1", customer: "cus_1" }
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.deleted",
      data: { object: mockSub },
    })

    await POST(makeRequest("{}", { "stripe-signature": "valid-sig" }))
    expect(mockSyncSubscription).toHaveBeenCalledWith(mockSub)
  })

  it("sends trial expiry email on trial_will_end", async () => {
    mockConstructEvent.mockReturnValue({
      type: "customer.subscription.trial_will_end",
      data: {
        object: {
          customer: "cus_1",
          trial_end: Math.floor(Date.now() / 1000) + 86400 * 3,
        },
      },
    })

    const res = await POST(
      makeRequest("{}", { "stripe-signature": "valid-sig" })
    )
    expect(res.status).toBe(200)
    expect(mockSendTrialEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        name: "TestUser",
      })
    )
  })

  it("sends payment failed email on invoice.payment_failed", async () => {
    mockConstructEvent.mockReturnValue({
      type: "invoice.payment_failed",
      data: {
        object: {
          customer: "cus_1",
          amount_due: 1500,
          currency: "cad",
          next_payment_attempt: Math.floor(Date.now() / 1000) + 86400,
        },
      },
    })

    const res = await POST(
      makeRequest("{}", { "stripe-signature": "valid-sig" })
    )
    expect(res.status).toBe(200)
    expect(mockSendPaymentEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "test@example.com",
        amountDue: 1500,
        currency: "cad",
      })
    )
  })

  it("returns received:true for unhandled event types", async () => {
    mockConstructEvent.mockReturnValue({
      type: "some.other.event",
      data: { object: {} },
    })

    const res = await POST(
      makeRequest("{}", { "stripe-signature": "valid-sig" })
    )
    const json = await res.json()
    expect(json.received).toBe(true)
  })
})
