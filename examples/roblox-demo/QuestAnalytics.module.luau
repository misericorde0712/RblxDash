local ServerScriptService = game:GetService("ServerScriptService")
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
