local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local ServerScriptService = game:GetService("ServerScriptService")

local ShopAnalytics = require(ServerScriptService:WaitForChild("ShopAnalytics"))

local PRODUCTS = {
    [1234567890] = {
        name = "Starter Pack",
        robuxPrice = 99,
    },
    [2345678901] = {
        name = "Coin Chest",
        robuxPrice = 49,
    },
}

local function grantReward(player, productId)
    if productId == 1234567890 then
        player:SetAttribute("StarterPackOwned", true)
        return
    end

    if productId == 2345678901 then
        local currentCoins = player:GetAttribute("Coins") or 0
        player:SetAttribute("Coins", currentCoins + 1000)
    end
end

MarketplaceService.ProcessReceipt = function(receiptInfo)
    local player = Players:GetPlayerByUserId(receiptInfo.PlayerId)
    if not player then
        return Enum.ProductPurchaseDecision.NotProcessedYet
    end

    local product = PRODUCTS[receiptInfo.ProductId]
    if not product then
        return Enum.ProductPurchaseDecision.PurchaseGranted
    end

    grantReward(player, receiptInfo.ProductId)

    ShopAnalytics.robuxPurchaseCompleted(
        player,
        "developer_product",
        receiptInfo.ProductId,
        product.robuxPrice,
        {
            productName = product.name,
            receiptId = receiptInfo.PurchaseId,
        }
    )

    return Enum.ProductPurchaseDecision.PurchaseGranted
end
