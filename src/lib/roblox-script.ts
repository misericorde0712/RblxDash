function escapeLuaString(value: string) {
    return value
        .replace(/\\/g, "\\\\")
        .replace(/\r/g, "")
        .replace(/\n/g, "\\n")
        .replace(/"/g, '\\"')
}

function toSafeFilenamePart(value: string) {
    const normalized = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")

    return normalized || "game"
}

export function getRobloxServerScriptFilename(gameName: string) {
    return `rblxdash-${toSafeFilenamePart(gameName)}.server.luau`
}

export function getRobloxServerModuleFilename(gameName: string) {
    return `rblxdash-${toSafeFilenamePart(gameName)}.module.luau`
}

export function buildRobloxServerModuleScript(params: { gameName: string }) {
    const gameLabel = params.gameName.replace(/[\r\n]+/g, " ")

    return `-- Dashblox server helper module for ${gameLabel}
-- Place this ModuleScript inside ServerScriptService.
-- Require it from your other server scripts to keep your analytics calls consistent.
-- The RblxDash bootstrap Script must already be installed and running.

local ServerStorage = game:GetService("ServerStorage")

local API_FOLDER_NAME = "RblxDash"
local TRACK_EVENT_FUNCTION_NAME = "TrackEvent"
local TRACK_ECONOMY_FUNCTION_NAME = "TrackEconomy"
local TRACK_PROGRESSION_FUNCTION_NAME = "TrackProgression"
local TRACK_ERROR_FUNCTION_NAME = "TrackError"

local Dashblox = {}

local function clonePayload(payload)
    local copy = {}

    if type(payload) ~= "table" then
        return copy
    end

    for key, value in pairs(payload) do
        copy[key] = value
    end

    return copy
end

local function mergePayloads(defaultPayload, payload)
    local merged = clonePayload(defaultPayload)

    if type(payload) == "table" then
        for key, value in pairs(payload) do
            merged[key] = value
        end
    end

    return merged
end

local function getApiFunction(functionName)
    local apiFolder = ServerStorage:WaitForChild(API_FOLDER_NAME)
    return apiFolder:WaitForChild(functionName)
end

function Dashblox.trackEvent(player, actionName, payload)
    return getApiFunction(TRACK_EVENT_FUNCTION_NAME):Invoke(player, actionName, payload or {})
end

function Dashblox.trackEconomy(player, flowType, currency, amount, payload)
    return getApiFunction(TRACK_ECONOMY_FUNCTION_NAME):Invoke(player, flowType, currency, amount, payload or {})
end

function Dashblox.trackProgression(player, stepName, payload)
    return getApiFunction(TRACK_PROGRESSION_FUNCTION_NAME):Invoke(player, stepName, payload or {})
end

function Dashblox.trackError(player, errorMessage, payload)
    return getApiFunction(TRACK_ERROR_FUNCTION_NAME):Invoke(player, errorMessage, payload or {})
end

function Dashblox.trackRobuxPurchase(player, purchaseType, amount, payload)
    local body = mergePayloads({
        purchaseType = purchaseType or "unknown",
        paymentProvider = "robux",
        entry = "robux_purchase",
    }, payload)

    return Dashblox.trackEconomy(player, "sink", "Robux", amount, body)
end

function Dashblox.createEventTracker(actionName, defaultPayload)
    return function(player, payload)
        return Dashblox.trackEvent(player, actionName, mergePayloads(defaultPayload, payload))
    end
end

function Dashblox.createEconomyTracker(flowType, currency, defaultPayload)
    return function(player, amount, payload)
        return Dashblox.trackEconomy(player, flowType, currency, amount, mergePayloads(defaultPayload, payload))
    end
end

function Dashblox.createProgressionTracker(stepName, defaultPayload)
    return function(player, payload)
        return Dashblox.trackProgression(player, stepName, mergePayloads(defaultPayload, payload))
    end
end

function Dashblox.createRobuxPurchaseTracker(purchaseType, defaultPayload)
    return function(player, amount, payload)
        return Dashblox.trackRobuxPurchase(
            player,
            purchaseType,
            amount,
            mergePayloads(defaultPayload, payload)
        )
    end
end

function Dashblox.withContext(contextPayload)
    local defaultPayload = clonePayload(contextPayload)

    return {
        trackEvent = function(player, actionName, payload)
            return Dashblox.trackEvent(player, actionName, mergePayloads(defaultPayload, payload))
        end,
        trackEconomy = function(player, flowType, currency, amount, payload)
            return Dashblox.trackEconomy(player, flowType, currency, amount, mergePayloads(defaultPayload, payload))
        end,
        trackProgression = function(player, stepName, payload)
            return Dashblox.trackProgression(player, stepName, mergePayloads(defaultPayload, payload))
        end,
        trackRobuxPurchase = function(player, purchaseType, amount, payload)
            return Dashblox.trackRobuxPurchase(
                player,
                purchaseType,
                amount,
                mergePayloads(defaultPayload, payload)
            )
        end,
        trackError = function(player, errorMessage, payload)
            return Dashblox.trackError(player, errorMessage, mergePayloads(defaultPayload, payload))
        end,
        createEventTracker = function(actionName, payload)
            return Dashblox.createEventTracker(actionName, mergePayloads(defaultPayload, payload))
        end,
        createEconomyTracker = function(flowType, currency, payload)
            return Dashblox.createEconomyTracker(flowType, currency, mergePayloads(defaultPayload, payload))
        end,
        createProgressionTracker = function(stepName, payload)
            return Dashblox.createProgressionTracker(stepName, mergePayloads(defaultPayload, payload))
        end,
        createRobuxPurchaseTracker = function(purchaseType, payload)
            return Dashblox.createRobuxPurchaseTracker(
                purchaseType,
                mergePayloads(defaultPayload, payload)
            )
        end,
    }
end

return Dashblox
`
}

export function buildRobloxServerScript(params: {
    gameName: string
    webhookUrl: string
    webhookSecret: string
    moderationUrl: string
}) {
    const gameLabel = params.gameName.replace(/[\r\n]+/g, " ")
    const escapedGameName = escapeLuaString(gameLabel)
    const escapedWebhookUrl = escapeLuaString(params.webhookUrl)
    const escapedWebhookSecret = escapeLuaString(params.webhookSecret)
    const escapedModerationUrl = escapeLuaString(params.moderationUrl)

    return `-- RblxDash integration bootstrap for ${gameLabel}
-- Place this Script inside ServerScriptService.
-- Make sure "Allow HTTP Requests" is enabled in Game Settings > Security.
--
-- Built-in events sent automatically:
--   server_started
--   server_heartbeat
--   player_join
--   player_leave
--   player_session_started
--   player_session_ended
-- Built-in moderation sync:
--   active kicks, timeouts, and bans are polled automatically
--   moderation_applied / moderation_failed are sent back to Dashblox
-- Built-in dashboard commands (via MessagingService topic "RblxDash"):
--   shutdown  — kicks all players and closes this server
--   broadcast — fires RblxDashBroadcast RemoteEvent to all clients
--   kick      — kicks a specific player by Roblox ID
--
-- Recommended developer usage:
--   local ServerScriptService = game:GetService("ServerScriptService")
--   local Dashblox = require(ServerScriptService:WaitForChild("Dashblox"))
--   Dashblox.trackEvent(player, "purchase_completed", {
--       productId = 123456,
--       currency = "Coins",
--       amount = 50,
--   })
--   local TrackShopPurchase = Dashblox.createEconomyTracker("sink", "Coins", {
--       entry = "shop_purchase",
--   })
--   TrackShopPurchase(player, 50, {
--       productId = 123456,
--   })
--   local TrackRobuxPurchase = Dashblox.createRobuxPurchaseTracker("developer_product", {
--       entry = "robux_purchase",
--   })
--   TrackRobuxPurchase(player, 99, {
--       productId = 123456,
--   })
--
-- Legacy bridge still supported:
--   local bridge = ServerStorage:WaitForChild("RblxDashEvent")
--   bridge:Fire(player, "purchase_completed", { ... })

local HttpService = game:GetService("HttpService")
local MessagingService = game:GetService("MessagingService")
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerStorage = game:GetService("ServerStorage")

local WEBHOOK_URL = "${escapedWebhookUrl}"
local WEBHOOK_SECRET = "${escapedWebhookSecret}"
local MODERATION_URL = "${escapedModerationUrl}"
local API_FOLDER_NAME = "RblxDash"
local LEGACY_BRIDGE_NAME = "RblxDashEvent"
local TRACK_EVENT_FUNCTION_NAME = "TrackEvent"
local TRACK_ECONOMY_FUNCTION_NAME = "TrackEconomy"
local TRACK_PROGRESSION_FUNCTION_NAME = "TrackProgression"
local TRACK_ERROR_FUNCTION_NAME = "TrackError"
local MODERATION_POLL_SECONDS = 10
local SERVER_HEARTBEAT_SECONDS = 30
local SERVER_STARTED_AT = os.time()
local SERVER_JOB_ID = game.JobId ~= "" and game.JobId or ("studio-" .. HttpService:GenerateGUID(false))
local SERVER_STOP_NOTIFIED = false

local function log(message)
    warn("[RblxDash] " .. message)
end

local function clonePayload(payload)
    local copy = {}

    if type(payload) ~= "table" then
        return copy
    end

    for key, value in pairs(payload) do
        copy[key] = value
    end

    return copy
end

local function ensureFolder(parent, folderName)
    local folder = parent:FindFirstChild(folderName)

    if folder and not folder:IsA("Folder") then
        folder:Destroy()
        folder = nil
    end

    if not folder then
        folder = Instance.new("Folder")
        folder.Name = folderName
        folder.Parent = parent
    end

    return folder
end

local function ensureBindableFunction(parent, functionName, onInvoke)
    local bindable = parent:FindFirstChild(functionName)

    if bindable and not bindable:IsA("BindableFunction") then
        bindable:Destroy()
        bindable = nil
    end

    if not bindable then
        bindable = Instance.new("BindableFunction")
        bindable.Name = functionName
        bindable.Parent = parent
    end

    bindable.OnInvoke = onInvoke
    return bindable
end

local function buildRequestBody(eventName, payload, player)
    local body = {
        event = eventName,
        payload = payload,
    }

    if player then
        body.robloxId = tostring(player.UserId)
        body.username = player.Name
        body.displayName = player.DisplayName
    end

    return HttpService:JSONEncode(body)
end

local function sendEvent(eventName, payload, player)
    local success, response = pcall(function()
        return HttpService:RequestAsync({
            Url = WEBHOOK_URL,
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json",
                ["x-webhook-secret"] = WEBHOOK_SECRET,
            },
            Body = buildRequestBody(eventName, payload, player),
        })
    end)

    if not success then
        log("HTTP request failed: " .. tostring(response))
        return false
    end

    if not response.Success then
        log("Webhook rejected the event with status " .. tostring(response.StatusCode))
        if response.Body and response.Body ~= "" then
            log("Response body: " .. response.Body)
        end
        return false
    end

    return true
end

local function buildBasePayload()
    return {
        source = "roblox",
        placeId = tostring(game.PlaceId),
        jobId = SERVER_JOB_ID,
    }
end

local function getConnectedPlayerIds(excludedPlayer)
    local playerIds = {}

    for _, candidate in ipairs(Players:GetPlayers()) do
        if candidate ~= excludedPlayer then
            table.insert(playerIds, tostring(candidate.UserId))
        end
    end

    return playerIds
end

local function buildServerPayload(excludedPlayer)
    local payload = buildBasePayload()
    local playerIds = getConnectedPlayerIds(excludedPlayer)
    payload.playerIds = playerIds
    payload.playerCount = #playerIds
    payload.uptimeSeconds = math.max(0, os.time() - SERVER_STARTED_AT)
    return payload
end

local function notifyServerStopped()
    if SERVER_STOP_NOTIFIED then
        return false
    end

    SERVER_STOP_NOTIFIED = true
    return sendEvent("server_stopped", buildServerPayload(), nil)
end

local function trackPlayerAction(player, actionName, payload)
    if typeof(player) ~= "Instance" or not player:IsA("Player") then
        log("TrackPlayerAction expected a Player instance")
        return false
    end

    if type(actionName) ~= "string" or actionName == "" then
        log("TrackPlayerAction expected a non-empty action name")
        return false
    end

    local body = clonePayload(payload)
    body.source = body.source or "roblox"
    body.placeId = body.placeId or tostring(game.PlaceId)
    body.jobId = body.jobId or SERVER_JOB_ID
    body.action = actionName

    return sendEvent("player_action", body, player)
end

local function trackEvent(player, actionName, payload)
    return trackPlayerAction(player, actionName, payload)
end

local function trackEconomy(player, flowType, currency, amount, payload)
    if flowType ~= "source" and flowType ~= "sink" then
        log("TrackEconomy expected flowType 'source' or 'sink'")
        return false
    end

    if type(currency) ~= "string" or currency == "" then
        log("TrackEconomy expected a non-empty currency")
        return false
    end

    local numericAmount = tonumber(amount)

    if not numericAmount then
        log("TrackEconomy expected a numeric amount")
        return false
    end

    local body = clonePayload(payload)
    body.flowType = flowType
    body.currency = currency
    body.amount = numericAmount

    return trackPlayerAction(player, "economy", body)
end

local function trackProgression(player, stepName, payload)
    if type(stepName) ~= "string" or stepName == "" then
        log("TrackProgression expected a non-empty step name")
        return false
    end

    local body = clonePayload(payload)
    body.step = stepName

    return trackPlayerAction(player, "progression", body)
end

local function trackError(player, errorMessage, payload)
    if type(errorMessage) ~= "string" or errorMessage == "" then
        log("TrackError expected a non-empty error message")
        return false
    end

    local body = clonePayload(payload)
    body.message = errorMessage

    return trackPlayerAction(player, "error", body)
end

local function sendModerationAck(eventName, player, sanction, details)
    local body = buildBasePayload()

    if type(sanction) == "table" then
        body.sanctionId = sanction.id
        body.sanctionType = sanction.type
        body.reason = sanction.reason
        body.expiresAt = sanction.expiresAt
    end

    if type(details) == "table" then
        for key, value in pairs(details) do
            body[key] = value
        end
    end

    return sendEvent(eventName, body, player)
end

local function moderationRequest(player)
    local success, response = pcall(function()
        return HttpService:RequestAsync({
            Url = MODERATION_URL .. "?robloxId=" .. HttpService:UrlEncode(tostring(player.UserId)),
            Method = "GET",
            Headers = {
                ["x-webhook-secret"] = WEBHOOK_SECRET,
            },
        })
    end)

    if not success then
        log("Moderation request failed: " .. tostring(response))
        return nil
    end

    if not response.Success then
        log("Moderation endpoint returned status " .. tostring(response.StatusCode))
        return nil
    end

    if not response.Body or response.Body == "" then
        return nil
    end

    local decodeSuccess, decodedBody = pcall(function()
        return HttpService:JSONDecode(response.Body)
    end)

    if not decodeSuccess then
        log("Unable to decode moderation response")
        return nil
    end

    return decodedBody
end

local function buildModerationMessage(sanction)
    if type(sanction) ~= "table" then
        return "Removed by moderation"
    end

    local prefix = sanction.type or "MODERATION"
    local reason = sanction.reason

    if type(reason) == "string" and reason ~= "" then
        return prefix .. ": " .. reason
    end

    return prefix
end

local function applyModeration(player)
    if typeof(player) ~= "Instance" or not player:IsA("Player") then
        return
    end

    local responseBody = moderationRequest(player)
    if not responseBody or type(responseBody.sanctions) ~= "table" then
        return
    end

    local sanction = responseBody.sanctions[1]
    if type(sanction) ~= "table" or type(sanction.type) ~= "string" then
        return
    end

    if sanction.type ~= "BAN" and sanction.type ~= "TIMEOUT" and sanction.type ~= "KICK" then
        return
    end

    local kickSuccess, kickError = pcall(function()
        player:Kick(buildModerationMessage(sanction))
    end)

    if kickSuccess then
        sendModerationAck("moderation_applied", player, sanction)
        return
    end

    sendModerationAck("moderation_failed", player, sanction, {
        error = tostring(kickError),
    })
    log("Unable to apply moderation action: " .. tostring(kickError))
end

local bridge = ServerStorage:FindFirstChild(LEGACY_BRIDGE_NAME)

if bridge and not bridge:IsA("BindableEvent") then
    bridge:Destroy()
    bridge = nil
end

if not bridge then
    bridge = Instance.new("BindableEvent")
    bridge.Name = LEGACY_BRIDGE_NAME
    bridge.Parent = ServerStorage
end

bridge.Event:Connect(function(player, actionName, payload)
    trackPlayerAction(player, actionName, payload)
end)

local apiFolder = ensureFolder(ServerStorage, API_FOLDER_NAME)

ensureBindableFunction(apiFolder, TRACK_EVENT_FUNCTION_NAME, function(player, actionName, payload)
    return trackEvent(player, actionName, payload)
end)

ensureBindableFunction(apiFolder, TRACK_ECONOMY_FUNCTION_NAME, function(player, flowType, currency, amount, payload)
    return trackEconomy(player, flowType, currency, amount, payload)
end)

ensureBindableFunction(apiFolder, TRACK_PROGRESSION_FUNCTION_NAME, function(player, stepName, payload)
    return trackProgression(player, stepName, payload)
end)

ensureBindableFunction(apiFolder, TRACK_ERROR_FUNCTION_NAME, function(player, errorMessage, payload)
    return trackError(player, errorMessage, payload)
end)

sendEvent("server_started", buildServerPayload(), nil)

Players.PlayerAdded:Connect(function(player)
    sendEvent("player_join", buildServerPayload(), player)
    sendEvent("player_session_started", buildServerPayload(), player)
    task.defer(function()
        applyModeration(player)
    end)
end)

Players.PlayerRemoving:Connect(function(player)
    sendEvent("player_leave", buildServerPayload(player), player)
    sendEvent("player_session_ended", buildServerPayload(player), player)
end)

task.spawn(function()
    while true do
        task.wait(SERVER_HEARTBEAT_SECONDS)
        sendEvent("server_heartbeat", buildServerPayload(), nil)
    end
end)

task.spawn(function()
    while true do
        task.wait(MODERATION_POLL_SECONDS)

        for _, player in ipairs(Players:GetPlayers()) do
            task.defer(function()
                applyModeration(player)
            end)
        end
    end
end)

-- MessagingService: listen for dashboard commands on topic "RblxDash"
local MESSAGING_TOPIC = "RblxDash"

local function handleDashboardCommand(data)
    local decoded = nil

    local decodeOk, decodeErr = pcall(function()
        decoded = HttpService:JSONDecode(data)
    end)

    if not decodeOk or type(decoded) ~= "table" then
        log("Failed to decode dashboard command: " .. tostring(decodeErr))
        return
    end

    local command = decoded.command
    local targetJobId = decoded.jobId or ""
    local payload = type(decoded.payload) == "table" and decoded.payload or {}

    -- If a jobId is specified and doesn't match this server, ignore
    if targetJobId ~= "" and targetJobId ~= SERVER_JOB_ID then
        return
    end

    if command == "shutdown" then
        log("Shutdown command received from dashboard")

        for _, player in ipairs(Players:GetPlayers()) do
            pcall(function()
                player:Kick("Server shutdown requested by administrator")
            end)
        end

        sendEvent("server_command_executed", {
            source = "roblox",
            placeId = tostring(game.PlaceId),
            jobId = SERVER_JOB_ID,
            command = "shutdown",
        }, nil)

        notifyServerStopped()
        task.wait(1)

    elseif command == "broadcast" then
        local message = payload.message
        if type(message) ~= "string" or message == "" then
            log("Broadcast command missing message")
            return
        end

        log("Broadcast command received: " .. message)

        -- Create or reuse RemoteEvent for client-side display
        local remoteEvent = ReplicatedStorage:FindFirstChild("RblxDashBroadcast")
        if not remoteEvent or not remoteEvent:IsA("RemoteEvent") then
            if remoteEvent then
                remoteEvent:Destroy()
            end
            remoteEvent = Instance.new("RemoteEvent")
            remoteEvent.Name = "RblxDashBroadcast"
            remoteEvent.Parent = ReplicatedStorage
        end

        remoteEvent:FireAllClients(message)

        sendEvent("server_command_executed", {
            source = "roblox",
            placeId = tostring(game.PlaceId),
            jobId = SERVER_JOB_ID,
            command = "broadcast",
            message = message,
        }, nil)

    elseif command == "kick" then
        local robloxId = payload.robloxId
        local reason = payload.reason or "Kicked by administrator"

        if type(robloxId) ~= "string" or robloxId == "" then
            log("Kick command missing robloxId")
            return
        end

        local targetUserId = tonumber(robloxId)
        if not targetUserId then
            log("Kick command has invalid robloxId: " .. robloxId)
            return
        end

        local targetPlayer = nil
        for _, player in ipairs(Players:GetPlayers()) do
            if player.UserId == targetUserId then
                targetPlayer = player
                break
            end
        end

        if not targetPlayer then
            log("Kick target not found on this server: " .. robloxId)
            return
        end

        log("Kick command received for player " .. targetPlayer.Name)

        local kickOk, kickErr = pcall(function()
            targetPlayer:Kick(reason)
        end)

        sendEvent("server_command_executed", {
            source = "roblox",
            placeId = tostring(game.PlaceId),
            jobId = SERVER_JOB_ID,
            command = "kick",
            robloxId = robloxId,
            success = kickOk,
            error = not kickOk and tostring(kickErr) or nil,
        }, nil)
    else
        log("Unknown dashboard command: " .. tostring(command))
    end
end

pcall(function()
    MessagingService:SubscribeAsync(MESSAGING_TOPIC, function(messageData)
        local ok, err = pcall(function()
            handleDashboardCommand(messageData.Data)
        end)
        if not ok then
            log("Error handling dashboard command: " .. tostring(err))
        end
    end)
    log("Subscribed to MessagingService topic: " .. MESSAGING_TOPIC)
end)

game:BindToClose(function()
    notifyServerStopped()
    task.wait(2)
end)

log("Ready for ${escapedGameName}")
log("Use ServerStorage." .. API_FOLDER_NAME .. ".TrackEvent:Invoke(player, \\"action_name\\", { ... }) for custom events")
log("Use ServerStorage." .. API_FOLDER_NAME .. ".TrackEconomy:Invoke(player, \\"sink\\", \\"Coins\\", 100, { ... }) for economy tracking")
log("Use ServerStorage." .. API_FOLDER_NAME .. ".TrackProgression:Invoke(player, \\"quest_completed\\", { ... }) for progression tracking")
log("Legacy ServerStorage." .. LEGACY_BRIDGE_NAME .. ":Fire(player, \\"action_name\\", { ... }) remains supported")
log("Active moderation sync enabled")
`
}
