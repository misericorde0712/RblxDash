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

export function getRobloxBootstrapScriptFilename(gameName: string) {
  return `rblxdash-${toSafeFilenamePart(gameName)}.server.luau`
}

export function getRobloxRuntimeModuleFilename(gameName: string) {
  return `rblxdash-${toSafeFilenamePart(gameName)}.runtime.module.luau`
}

export function buildRobloxBootstrapScript(params: {
  webhookUrl: string
  webhookSecret: string
  moderationUrl: string
}) {
  const escapedWebhookUrl = escapeLuaString(params.webhookUrl)
  const escapedWebhookSecret = escapeLuaString(params.webhookSecret)
  const escapedModerationUrl = escapeLuaString(params.moderationUrl)

  return `local ServerScriptService = game:GetService("ServerScriptService")
local DashbloxRuntime = require(ServerScriptService:WaitForChild("DashbloxRuntime"))

DashbloxRuntime.start({
    webhookUrl = "${escapedWebhookUrl}",
    webhookSecret = "${escapedWebhookSecret}",
    moderationUrl = "${escapedModerationUrl}",
    heartbeatSeconds = 30,
    moderationPollSeconds = 60,
    enablePlayerLifecycle = true,
    enableModeration = true,
})`
}

export function buildRobloxRuntimeModuleScript() {
  return `local HttpService = game:GetService("HttpService")
local Players = game:GetService("Players")
local ServerStorage = game:GetService("ServerStorage")
local DataStoreService = game:GetService("DataStoreService")
local MessagingService = game:GetService("MessagingService")

local API_FOLDER_NAME_DEFAULT = "RblxDash"
local LEGACY_BRIDGE_NAME_DEFAULT = "RblxDashEvent"
local TRACK_EVENT_FUNCTION_NAME = "TrackEvent"
local TRACK_ECONOMY_FUNCTION_NAME = "TrackEconomy"
local TRACK_PROGRESSION_FUNCTION_NAME = "TrackProgression"

local Runtime = {}

local state = {
    started = false,
    config = nil,
    startedAt = 0,
    serverJobId = nil,
    stopNotified = false,
}

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

local function ensureBindableEvent(parent, eventName)
    local bindable = parent:FindFirstChild(eventName)

    if bindable and not bindable:IsA("BindableEvent") then
        bindable:Destroy()
        bindable = nil
    end

    if not bindable then
        bindable = Instance.new("BindableEvent")
        bindable.Name = eventName
        bindable.Parent = parent
    end

    return bindable
end

local function log(message)
    warn("[DashbloxRuntime] " .. message)
end

local function getConfig()
    if not state.config then
        error("DashbloxRuntime.start({...}) must be called before using this module")
    end

    return state.config
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
    local config = getConfig()
    local success, response = pcall(function()
        return HttpService:RequestAsync({
            Url = config.webhookUrl,
            Method = "POST",
            Headers = {
                ["Content-Type"] = "application/json",
                ["x-webhook-secret"] = config.webhookSecret,
            },
            Body = buildRequestBody(eventName, payload, player),
        })
    end)

    if not success then
        log("HTTP request failed: " .. tostring(response))
        return false
    end

    if not response.Success then
        log("Webhook rejected event with status " .. tostring(response.StatusCode))
        return false
    end

    return true
end

local function buildBasePayload()
    local config = getConfig()

    return {
        source = config.sourceName,
        placeId = tostring(game.PlaceId),
        jobId = state.serverJobId,
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
    payload.uptimeSeconds = math.max(0, os.time() - state.startedAt)
    return payload
end

local function notifyServerStopped()
    if state.stopNotified then
        return false
    end

    state.stopNotified = true
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
    body.source = body.source or getConfig().sourceName
    body.placeId = body.placeId or tostring(game.PlaceId)
    body.jobId = body.jobId or state.serverJobId
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
    local config = getConfig()
    local success, response = pcall(function()
        return HttpService:RequestAsync({
            Url = config.moderationUrl .. "?robloxId=" .. HttpService:UrlEncode(tostring(player.UserId)),
            Method = "GET",
            Headers = {
                ["x-webhook-secret"] = config.webhookSecret,
            },
        })
    end)

    if not success or not response.Success then
        return nil
    end

    if not response.Body or response.Body == "" then
        return nil
    end

    local decodeSuccess, decodedBody = pcall(function()
        return HttpService:JSONDecode(response.Body)
    end)

    if not decodeSuccess then
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

local function checkDataStoreBan(player)
    local success, result = pcall(function()
        local banStore = DataStoreService:GetDataStore("RblxDash_Bans")
        return banStore:GetAsync(tostring(player.UserId))
    end)

    if not success or type(result) ~= "table" then
        return nil
    end

    if not result.banned then
        return nil
    end

    -- Check expiry
    if type(result.expiresAt) == "string" and result.expiresAt ~= "" then
        local now = os.time()
        -- Parse ISO date (approximate: works for most cases)
        local year, month, day, hour, min, sec = result.expiresAt:match("(%d+)-(%d+)-(%d+)T(%d+):(%d+):(%d+)")
        if year then
            local expiryTime = os.time({
                year = tonumber(year),
                month = tonumber(month),
                day = tonumber(day),
                hour = tonumber(hour),
                min = tonumber(min),
                sec = tonumber(sec),
            })
            if now >= expiryTime then
                return nil
            end
        end
    end

    return {
        type = "BAN",
        reason = result.reason or "Banned",
        moderator = result.moderator or "System",
        id = "datastore",
    }
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

    -- Persist ban/timeout to DataStore so it survives server restarts
    if sanction.type == "BAN" or sanction.type == "TIMEOUT" then
        writeDataStoreBan(tostring(player.UserId), {
            reason = sanction.reason,
            moderator = sanction.moderator,
            expiresAt = sanction.expiresAt,
        })
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
end

local function writeDataStoreBan(robloxId, data)
    pcall(function()
        local banStore = DataStoreService:GetDataStore("RblxDash_Bans")
        banStore:SetAsync(tostring(robloxId), {
            banned = true,
            reason = data.reason or "Banned",
            moderator = data.moderator or "System",
            bannedAt = os.date("!%Y-%m-%dT%H:%M:%SZ"),
            expiresAt = data.expiresAt,
        })
        log("DataStore ban written for " .. tostring(robloxId))
    end)
end

local function removeDataStoreBan(robloxId)
    pcall(function()
        local banStore = DataStoreService:GetDataStore("RblxDash_Bans")
        banStore:RemoveAsync(tostring(robloxId))
        log("DataStore ban removed for " .. tostring(robloxId))
    end)
end

local function applyInstantModeration(data)
    if type(data) ~= "table" or type(data.robloxId) ~= "string" then
        return
    end

    local targetUserId = tonumber(data.robloxId)
    if not targetUserId then
        return
    end

    -- Write/remove DataStore ban for persistence across server restarts
    if data.action == "BAN" or data.action == "TIMEOUT" then
        writeDataStoreBan(data.robloxId, data)
    elseif data.action == "UNBAN" then
        removeDataStoreBan(data.robloxId)
        log("Unban received for " .. data.robloxId .. " via MessagingService")
        return
    end

    -- Find the player in this server
    local player = nil
    for _, p in ipairs(Players:GetPlayers()) do
        if p.UserId == targetUserId then
            player = p
            break
        end
    end

    if not player then
        return
    end

    local sanction = {
        id = data.sanctionId,
        type = data.action,
        reason = data.reason,
        expiresAt = data.expiresAt,
    }

    local kickSuccess, kickError = pcall(function()
        player:Kick(buildModerationMessage(sanction))
    end)

    if kickSuccess then
        sendModerationAck("moderation_applied", player, sanction)
    else
        sendModerationAck("moderation_failed", player, sanction, {
            error = tostring(kickError),
        })
    end
end

function Runtime.start(config)
    if state.started then
        log("DashbloxRuntime.start() was already called")
        return false
    end

    if type(config) ~= "table" then
        error("DashbloxRuntime.start expected a config table")
    end

    if type(config.webhookUrl) ~= "string" or config.webhookUrl == "" then
        error("DashbloxRuntime.start expected a non-empty webhookUrl")
    end

    if type(config.webhookSecret) ~= "string" or config.webhookSecret == "" then
        error("DashbloxRuntime.start expected a non-empty webhookSecret")
    end

    if type(config.moderationUrl) ~= "string" or config.moderationUrl == "" then
        error("DashbloxRuntime.start expected a non-empty moderationUrl")
    end

    state.config = {
        webhookUrl = config.webhookUrl,
        webhookSecret = config.webhookSecret,
        moderationUrl = config.moderationUrl,
        apiFolderName = config.apiFolderName or API_FOLDER_NAME_DEFAULT,
        legacyBridgeName = config.legacyBridgeName or LEGACY_BRIDGE_NAME_DEFAULT,
        sourceName = config.sourceName or "roblox",
        heartbeatSeconds = config.heartbeatSeconds or 30,
        moderationPollSeconds = config.moderationPollSeconds or 10,
        enablePlayerLifecycle = config.enablePlayerLifecycle ~= false,
        enableModeration = config.enableModeration ~= false,
    }
    state.started = true
    state.startedAt = os.time()
    state.serverJobId = game.JobId ~= "" and game.JobId or ("studio-" .. HttpService:GenerateGUID(false))

    local activeConfig = getConfig()
    local apiFolder = ensureFolder(ServerStorage, activeConfig.apiFolderName)
    local bridge = ensureBindableEvent(ServerStorage, activeConfig.legacyBridgeName)

    bridge.Event:Connect(function(player, actionName, payload)
        trackPlayerAction(player, actionName, payload)
    end)

    ensureBindableFunction(apiFolder, TRACK_EVENT_FUNCTION_NAME, function(player, actionName, payload)
        return trackEvent(player, actionName, payload)
    end)

    ensureBindableFunction(apiFolder, TRACK_ECONOMY_FUNCTION_NAME, function(player, flowType, currency, amount, payload)
        return trackEconomy(player, flowType, currency, amount, payload)
    end)

    ensureBindableFunction(apiFolder, TRACK_PROGRESSION_FUNCTION_NAME, function(player, stepName, payload)
        return trackProgression(player, stepName, payload)
    end)


    sendEvent("server_started", buildServerPayload(), nil)

    if activeConfig.enablePlayerLifecycle then
        Players.PlayerAdded:Connect(function(player)
            -- Layer 1: Check DataStore ban instantly (no HTTP needed)
            if activeConfig.enableModeration then
                local datastoreBan = checkDataStoreBan(player)
                if datastoreBan then
                    log("Player " .. tostring(player.UserId) .. " banned via DataStore")
                    local kickOk = pcall(function()
                        player:Kick(buildModerationMessage(datastoreBan))
                    end)
                    if kickOk then
                        sendModerationAck("moderation_applied", player, datastoreBan)
                    end
                    return
                end
            end

            sendEvent("player_join", buildServerPayload(), player)
            sendEvent("player_session_started", buildServerPayload(), player)

            -- Layer 2: Check API for pending sanctions (kick, timeout, etc.)
            if activeConfig.enableModeration then
                task.defer(function()
                    applyModeration(player)
                end)
            end
        end)

        Players.PlayerRemoving:Connect(function(player)
            sendEvent("player_leave", buildServerPayload(player), player)
            sendEvent("player_session_ended", buildServerPayload(player), player)
        end)
    end

    -- Layer 3: Subscribe to MessagingService for instant sanctions
    if activeConfig.enableModeration then
        local subscribeOk, subscribeErr = pcall(function()
            MessagingService:SubscribeAsync("RblxDash_Moderation", function(message)
                if type(message) ~= "table" or type(message.Data) ~= "string" then
                    return
                end

                local decodeOk, data = pcall(function()
                    return HttpService:JSONDecode(message.Data)
                end)

                if decodeOk and type(data) == "table" then
                    task.defer(function()
                        applyInstantModeration(data)
                    end)
                end
            end)
        end)

        if subscribeOk then
            log("Subscribed to MessagingService topic RblxDash_Moderation")
        else
            log("MessagingService subscribe failed: " .. tostring(subscribeErr))
        end
    end

    task.spawn(function()
        while true do
            task.wait(activeConfig.heartbeatSeconds)
            sendEvent("server_heartbeat", buildServerPayload(), nil)
        end
    end)

    -- Layer 4: Polling fallback (safety net, reduced frequency)
    if activeConfig.enableModeration then
        task.spawn(function()
            while true do
                task.wait(activeConfig.moderationPollSeconds)

                for _, player in ipairs(Players:GetPlayers()) do
                    task.defer(function()
                        applyModeration(player)
                    end)
                end
            end
        end)
    end

    game:BindToClose(function()
        notifyServerStopped()
        task.wait(2)
    end)

    return true
end

return Runtime`
}
