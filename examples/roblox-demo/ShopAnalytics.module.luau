local ServerScriptService = game:GetService("ServerScriptService")
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
