local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game:GetService("Workspace")

local LiveEvents = require(ServerScriptService:WaitForChild("RblxDashLiveEvents"))

local stateFolder = Workspace:FindFirstChild("RblxDashDemoState")
if not stateFolder then
    stateFolder = Instance.new("Folder")
    stateFolder.Name = "RblxDashDemoState"
    stateFolder.Parent = Workspace
end

local function applyEvents()
    local halloween = LiveEvents.get("halloween-2026")
    local doubleXPWeekend = LiveEvents.get("double-xp-weekend")

    stateFolder:SetAttribute("HalloweenActive", halloween ~= nil)
    stateFolder:SetAttribute("DoubleXPWeekendActive", doubleXPWeekend ~= nil)

    if doubleXPWeekend and type(doubleXPWeekend.data) == "table" then
        local multiplier = tonumber(doubleXPWeekend.data.multiplier) or 2
        stateFolder:SetAttribute("DoubleXPMultiplier", multiplier)
    else
        stateFolder:SetAttribute("DoubleXPMultiplier", 1)
    end
end

applyEvents()

LiveEvents.onChanged:Connect(function()
    applyEvents()
    print("[LiveEventsExample] Active event count", #LiveEvents.getActive())
end)
