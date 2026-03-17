function toSafeFilenamePart(value: string) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  return normalized || "game"
}

export type RobloxStarterTemplateId = "match" | "shop" | "quest"

export type RobloxStarterTemplateDefinition = {
  id: RobloxStarterTemplateId
  title: string
  summary: string
  highlights: string[]
}

export const ROBLOX_STARTER_TEMPLATE_DEFINITIONS: RobloxStarterTemplateDefinition[] =
  [
    {
      id: "match",
      title: "MatchAnalytics",
      summary:
        "Starter module pour suivre les matches, rounds, issues et abandons.",
      highlights: [
        "matchStarted",
        "matchFinished",
        "roundStarted",
        "roundFinished",
        "playerAbandoned",
      ],
    },
    {
      id: "shop",
      title: "ShopAnalytics",
      summary:
        "Starter module pour la boutique: ouvertures, vues produit, achats Coins, achats Robux et erreurs.",
      highlights: [
        "shopOpened",
        "productViewed",
        "purchaseStarted",
        "purchaseCompleted",
        "robuxPurchaseCompleted",
        "purchaseFailed",
      ],
    },
    {
      id: "quest",
      title: "QuestAnalytics",
      summary:
        "Starter module pour les quêtes: départ, progression, complétion et récompenses.",
      highlights: [
        "questStarted",
        "questProgressed",
        "questCompleted",
        "rewardClaimed",
      ],
    },
  ]

export function isRobloxStarterTemplateId(
  value: string
): value is RobloxStarterTemplateId {
  return ROBLOX_STARTER_TEMPLATE_DEFINITIONS.some(
    (template) => template.id === value
  )
}

export function getRobloxStarterModuleFilename(
  gameName: string,
  templateId: RobloxStarterTemplateId
) {
  return `rblxdash-${toSafeFilenamePart(gameName)}-${templateId}-analytics.module.luau`
}

function buildMatchStarterModule() {
  return `local ServerScriptService = game:GetService("ServerScriptService")
local Dashblox = require(ServerScriptService:WaitForChild("Dashblox"))

local MatchAnalytics = {}

local TrackMatchStarted = Dashblox.createEventTracker("match_started")
local TrackMatchFinished = Dashblox.createEventTracker("match_finished")
local TrackRoundStarted = Dashblox.createEventTracker("round_started")
local TrackRoundFinished = Dashblox.createEventTracker("round_finished")
local TrackPlayerAbandoned = Dashblox.createEventTracker("match_player_abandoned")

function MatchAnalytics.matchStarted(player, matchId, payload)
  local body = payload or {}
  body.matchId = matchId
  return TrackMatchStarted(player, body)
end

function MatchAnalytics.matchFinished(player, matchId, result, payload)
  local body = payload or {}
  body.matchId = matchId
  body.result = result
  return TrackMatchFinished(player, body)
end

function MatchAnalytics.roundStarted(player, matchId, roundNumber, payload)
  local body = payload or {}
  body.matchId = matchId
  body.roundNumber = roundNumber
  return TrackRoundStarted(player, body)
end

function MatchAnalytics.roundFinished(player, matchId, roundNumber, result, payload)
  local body = payload or {}
  body.matchId = matchId
  body.roundNumber = roundNumber
  body.result = result
  return TrackRoundFinished(player, body)
end

function MatchAnalytics.playerAbandoned(player, matchId, payload)
  local body = payload or {}
  body.matchId = matchId
  return TrackPlayerAbandoned(player, body)
end

return MatchAnalytics
`
}

function buildShopStarterModule() {
  return `local ServerScriptService = game:GetService("ServerScriptService")
local Dashblox = require(ServerScriptService:WaitForChild("Dashblox"))

local ShopAnalytics = {}

local TrackShopOpened = Dashblox.createEventTracker("shop_opened")
local TrackProductViewed = Dashblox.createEventTracker("shop_product_viewed")
local TrackPurchaseStarted = Dashblox.createEventTracker("shop_purchase_started")
local TrackCoinsPurchaseCompleted = Dashblox.createEconomyTracker("sink", "Coins", {
  entry = "shop_purchase",
})
local TrackRobuxPurchaseStarted = Dashblox.createEventTracker("robux_purchase_started")
local TrackPurchaseFailed = Dashblox.createEventTracker("shop_purchase_failed")
local TrackRobuxPurchaseFailed = Dashblox.createEventTracker("robux_purchase_failed")

function ShopAnalytics.shopOpened(player, payload)
  return TrackShopOpened(player, payload)
end

function ShopAnalytics.productViewed(player, itemId, payload)
  local body = payload or {}
  body.itemId = itemId
  return TrackProductViewed(player, body)
end

function ShopAnalytics.purchaseStarted(player, itemId, price, payload)
  local body = payload or {}
  body.itemId = itemId
  body.price = price
  return TrackPurchaseStarted(player, body)
end

function ShopAnalytics.purchaseCompleted(player, itemId, amount, payload)
  local body = payload or {}
  body.itemId = itemId
  return TrackCoinsPurchaseCompleted(player, amount, body)
end

function ShopAnalytics.robuxPurchaseStarted(player, purchaseType, productId, robuxPrice, payload)
  local body = payload or {}
  body.purchaseType = purchaseType
  body.productId = productId
  body.robuxPrice = robuxPrice
  return TrackRobuxPurchaseStarted(player, body)
end

function ShopAnalytics.robuxPurchaseCompleted(player, purchaseType, productId, robuxSpent, payload)
  local body = payload or {}
  body.productId = productId
  return Dashblox.trackRobuxPurchase(player, purchaseType, robuxSpent, body)
end

function ShopAnalytics.purchaseFailed(player, itemId, reason, payload)
  local body = payload or {}
  body.itemId = itemId
  body.reason = reason
  return TrackPurchaseFailed(player, body)
end

function ShopAnalytics.robuxPurchaseFailed(player, purchaseType, productId, reason, payload)
  local body = payload or {}
  body.purchaseType = purchaseType
  body.productId = productId
  body.reason = reason
  return TrackRobuxPurchaseFailed(player, body)
end

return ShopAnalytics
`
}

function buildQuestStarterModule() {
  return `local ServerScriptService = game:GetService("ServerScriptService")
local Dashblox = require(ServerScriptService:WaitForChild("Dashblox"))

local QuestAnalytics = {}

local QuestContext = Dashblox.withContext({
  system = "quests",
})

local TrackQuestStarted = QuestContext.createProgressionTracker("quest_started")
local TrackQuestProgressed = QuestContext.createProgressionTracker("quest_progressed")
local TrackQuestCompleted = QuestContext.createProgressionTracker("quest_completed")
local TrackQuestRewardClaimed = QuestContext.createEconomyTracker("source", "Coins", {
  entry = "quest_reward",
})

function QuestAnalytics.questStarted(player, questId, payload)
  local body = payload or {}
  body.questId = questId
  return TrackQuestStarted(player, body)
end

function QuestAnalytics.questProgressed(player, questId, step, payload)
  local body = payload or {}
  body.questId = questId
  body.step = step
  return TrackQuestProgressed(player, body)
end

function QuestAnalytics.questCompleted(player, questId, xpReward, payload)
  local body = payload or {}
  body.questId = questId
  body.xp = xpReward
  return TrackQuestCompleted(player, body)
end

function QuestAnalytics.rewardClaimed(player, questId, coinsReward, payload)
  local body = payload or {}
  body.questId = questId
  return TrackQuestRewardClaimed(player, coinsReward, body)
end

return QuestAnalytics
`
}

export function buildRobloxStarterModuleScript(params: {
  templateId: RobloxStarterTemplateId
}) {
  if (params.templateId === "match") {
    return buildMatchStarterModule()
  }

  if (params.templateId === "shop") {
    return buildShopStarterModule()
  }

  return buildQuestStarterModule()
}
