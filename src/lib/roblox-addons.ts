/**
 * Roblox Add-on modules — optional scripts users can install alongside the base SDK.
 *
 * Each add-on is a standalone ModuleScript that can be placed in ServerScriptService.
 * Add-ons are self-contained and only depend on HttpService + the webhook secret.
 */

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

export type AddonId = "live-config" | "live-events"

export const ADDONS: Record<
  AddonId,
  {
    name: string
    description: string
    icon: string
  }
> = {
  "live-config": {
    name: "Live Config",
    description:
      "Change game parameters in real-time from the dashboard without republishing. Polls for changes every 60 seconds with ETag caching.",
    icon: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
  },
  "live-events": {
    name: "Live Events",
    description:
      "Schedule and control in-game events from the dashboard. Start, stop, and configure events with custom data — your game reacts in real-time.",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
}

export function getLiveConfigAddonFilename(gameName: string) {
  return `rblxdash-${toSafeFilenamePart(gameName)}.live-config.module.luau`
}

export function getLiveEventsAddonFilename(gameName: string) {
  return `rblxdash-${toSafeFilenamePart(gameName)}.live-events.module.luau`
}

/**
 * Generates the Live Config add-on ModuleScript.
 * Self-contained — fetches configs from the dashboard API and exposes them
 * via a simple require() interface.
 */
export function buildLiveConfigAddon(params: {
  configUrl: string
  webhookSecret: string
}) {
  const escapedConfigUrl = escapeLuaString(params.configUrl)
  const escapedWebhookSecret = escapeLuaString(params.webhookSecret)

  return `-- RblxDash Live Config Add-on
-- Place this ModuleScript inside ServerScriptService.
-- Require it from any server script to read live config values.
--
-- Usage:
--   local LiveConfig = require(ServerScriptService:WaitForChild("RblxDashLiveConfig"))
--
--   -- Get a single value
--   local maxPlayers = LiveConfig.get("game.maxPlayers")
--
--   -- Get a value with a default fallback
--   local difficulty = LiveConfig.get("game.difficulty", "normal")
--
--   -- Get all configs as a table
--   local allConfigs = LiveConfig.getAll()
--
--   -- Listen for config changes
--   LiveConfig.onChanged:Connect(function(newConfig, oldConfig)
--       print("Config updated to version", LiveConfig.getVersion())
--   end)
--
--   -- Force an immediate refresh (instead of waiting for next poll)
--   LiveConfig.refresh()

local HttpService = game:GetService("HttpService")
local MessagingService = game:GetService("MessagingService")

local CONFIG_URL = "${escapedConfigUrl}"
local WEBHOOK_SECRET = "${escapedWebhookSecret}"
local POLL_SECONDS = 60

local LiveConfig = {}

local configData = {}
local configVersion = nil
local onChangedEvent = Instance.new("BindableEvent")

LiveConfig.onChanged = onChangedEvent.Event

local function fetchConfig()
    local headers = {
        ["x-webhook-secret"] = WEBHOOK_SECRET,
    }

    if configVersion then
        headers["If-None-Match"] = '"v' .. tostring(configVersion) .. '"'
    end

    local success, response = pcall(function()
        return HttpService:RequestAsync({
            Url = CONFIG_URL,
            Method = "GET",
            Headers = headers,
        })
    end)

    if not success then
        warn("[RblxDash LiveConfig] Fetch failed: " .. tostring(response))
        return false
    end

    if response.StatusCode == 304 then
        return false
    end

    if not response.Success then
        warn("[RblxDash LiveConfig] Fetch rejected: " .. tostring(response.StatusCode))
        return false
    end

    local decodeOk, decoded = pcall(function()
        return HttpService:JSONDecode(response.Body)
    end)

    if not decodeOk or type(decoded) ~= "table" then
        warn("[RblxDash LiveConfig] Invalid response JSON")
        return false
    end

    local oldConfig = configData
    configData = decoded.config or {}
    configVersion = decoded.version

    warn("[RblxDash LiveConfig] Updated to v" .. tostring(decoded.version))
    onChangedEvent:Fire(configData, oldConfig)
    return true
end

function LiveConfig.get(key, default)
    if key == nil then
        return configData
    end

    local value = configData[key]

    if value == nil then
        return default
    end

    return value
end

function LiveConfig.getAll()
    local copy = {}

    for k, v in pairs(configData) do
        copy[k] = v
    end

    return copy
end

function LiveConfig.getVersion()
    return configVersion
end

function LiveConfig.refresh()
    return fetchConfig()
end

-- Initial fetch
task.spawn(function()
    fetchConfig()
end)

-- Instant updates via MessagingService
task.spawn(function()
    local ok, err = pcall(function()
        MessagingService:SubscribeAsync("RblxDash_LiveConfig", function(message)
            task.defer(function()
                fetchConfig()
            end)
        end)
    end)

    if ok then
        warn("[RblxDash LiveConfig] Subscribed to MessagingService for instant updates")
    else
        warn("[RblxDash LiveConfig] MessagingService subscribe failed: " .. tostring(err))
    end
end)

-- Polling fallback (safety net)
task.spawn(function()
    while true do
        task.wait(POLL_SECONDS)
        fetchConfig()
    end
end)

return LiveConfig
`
}

/**
 * Generates the Live Events add-on ModuleScript.
 * Polls for active events and exposes them via a simple require() interface.
 */
export function buildLiveEventsAddon(params: {
  eventsUrl: string
  webhookSecret: string
}) {
  const escapedEventsUrl = escapeLuaString(params.eventsUrl)
  const escapedWebhookSecret = escapeLuaString(params.webhookSecret)

  return `-- RblxDash Live Events Add-on
-- Place this ModuleScript inside ServerScriptService.
-- Require it from any server script to read active live events.
--
-- Usage:
--   local LiveEvents = require(ServerScriptService:WaitForChild("RblxDashLiveEvents"))
--
--   -- Get all currently active events
--   local events = LiveEvents.getActive()
--
--   -- Check if a specific event is active (by slug)
--   local halloween = LiveEvents.get("halloween-2026")
--   if halloween then
--       print("Event active:", halloween.name)
--       print("Data:", halloween.data) -- custom JSON data as a table
--   end
--
--   -- Listen for event changes
--   LiveEvents.onChanged:Connect(function(activeEvents, previousEvents)
--       print("Events updated to v" .. tostring(LiveEvents.getVersion()))
--   end)
--
--   -- Force an immediate refresh
--   LiveEvents.refresh()

local HttpService = game:GetService("HttpService")
local MessagingService = game:GetService("MessagingService")

local EVENTS_URL = "${escapedEventsUrl}"
local WEBHOOK_SECRET = "${escapedWebhookSecret}"
local POLL_SECONDS = 60

local LiveEvents = {}

local activeEvents = {}
local eventsBySlug = {}
local eventsVersion = nil
local onChangedEvent = Instance.new("BindableEvent")

LiveEvents.onChanged = onChangedEvent.Event

local function fetchEvents()
    local headers = {
        ["x-webhook-secret"] = WEBHOOK_SECRET,
    }

    if eventsVersion then
        headers["If-None-Match"] = '"v' .. tostring(eventsVersion) .. '"'
    end

    local success, response = pcall(function()
        return HttpService:RequestAsync({
            Url = EVENTS_URL,
            Method = "GET",
            Headers = headers,
        })
    end)

    if not success then
        warn("[RblxDash LiveEvents] Fetch failed: " .. tostring(response))
        return false
    end

    if response.StatusCode == 304 then
        return false
    end

    if not response.Success then
        warn("[RblxDash LiveEvents] Fetch rejected: " .. tostring(response.StatusCode))
        return false
    end

    local decodeOk, decoded = pcall(function()
        return HttpService:JSONDecode(response.Body)
    end)

    if not decodeOk or type(decoded) ~= "table" then
        warn("[RblxDash LiveEvents] Invalid response JSON")
        return false
    end

    local oldEvents = activeEvents
    activeEvents = decoded.events or {}
    eventsVersion = decoded.version

    -- Build slug lookup
    eventsBySlug = {}
    for _, event in ipairs(activeEvents) do
        if event.slug then
            eventsBySlug[event.slug] = event
        end
    end

    warn("[RblxDash LiveEvents] Updated to v" .. tostring(decoded.version) .. " (" .. #activeEvents .. " active)")
    onChangedEvent:Fire(activeEvents, oldEvents)
    return true
end

function LiveEvents.getActive()
    local copy = {}
    for i, event in ipairs(activeEvents) do
        copy[i] = event
    end
    return copy
end

function LiveEvents.get(slug)
    return eventsBySlug[slug]
end

function LiveEvents.isActive(slug)
    return eventsBySlug[slug] ~= nil
end

function LiveEvents.getVersion()
    return eventsVersion
end

function LiveEvents.refresh()
    return fetchEvents()
end

-- Initial fetch
task.spawn(function()
    fetchEvents()
end)

-- Instant updates via MessagingService
task.spawn(function()
    local ok, err = pcall(function()
        MessagingService:SubscribeAsync("RblxDash_LiveEvents", function(_message)
            task.defer(function()
                fetchEvents()
            end)
        end)
    end)

    if ok then
        warn("[RblxDash LiveEvents] Subscribed to MessagingService for instant updates")
    else
        warn("[RblxDash LiveEvents] MessagingService subscribe failed: " .. tostring(err))
    end
end)

-- Polling fallback (safety net)
task.spawn(function()
    while true do
        task.wait(POLL_SECONDS)
        fetchEvents()
    end
end)

return LiveEvents
`
}
