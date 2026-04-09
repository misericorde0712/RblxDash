local ServerScriptService = game:GetService("ServerScriptService")
local Workspace = game:GetService("Workspace")

local LiveConfig = require(ServerScriptService:WaitForChild("RblxDashLiveConfig"))

local stateFolder = Workspace:FindFirstChild("RblxDashDemoState")
if not stateFolder then
    stateFolder = Instance.new("Folder")
    stateFolder.Name = "RblxDashDemoState"
    stateFolder.Parent = Workspace
end

local function applyConfig()
    stateFolder:SetAttribute("MaxPlayers", LiveConfig.get("game.maxPlayers", 12))
    stateFolder:SetAttribute("CoinMultiplier", LiveConfig.get("economy.coinMultiplier", 1))
    stateFolder:SetAttribute("DoubleXPEnabled", LiveConfig.get("events.doubleXpEnabled", false))
end

applyConfig()

LiveConfig.onChanged:Connect(function()
    applyConfig()
    print("[LiveConfigExample] Applied config version", LiveConfig.getVersion())
end)
