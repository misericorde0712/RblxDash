local ServerScriptService = game:GetService("ServerScriptService")
local Dashblox = require(ServerScriptService:WaitForChild("Dashblox"))

local GameplayAnalytics = {}

local TrackQuestCompleted = Dashblox.createEventTracker("quest_completed")
local TrackMatchEnded = Dashblox.createEventTracker("match_ended")
local TrackItemCrafted = Dashblox.createEventTracker("item_crafted")

function GameplayAnalytics.questCompleted(player, questId, xpGained, payload)
    local body = payload or {}
    body.questId = questId
    body.xpGained = xpGained
    return TrackQuestCompleted(player, body)
end

function GameplayAnalytics.matchEnded(player, matchId, result, durationSeconds, kills, payload)
    local body = payload or {}
    body.matchId = matchId
    body.result = result
    body.durationSeconds = durationSeconds
    body.kills = kills
    return TrackMatchEnded(player, body)
end

function GameplayAnalytics.itemCrafted(player, itemId, materials, payload)
    local body = payload or {}
    body.itemId = itemId
    body.materials = materials
    return TrackItemCrafted(player, body)
end

return GameplayAnalytics
