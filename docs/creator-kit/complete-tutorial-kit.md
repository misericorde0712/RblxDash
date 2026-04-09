# Complete Technical Tutorial Kit

This is the advanced technical variant.

If you want the tutorial to feel more like a real customer onboarding flow, use `real-user-tutorial-kit.md` instead.

## Goal

Create a tutorial that does two things clearly:

1. shows how to connect a Roblox game to RblxDash
2. shows how to use RblxDash inside a real game codebase, not just in the dashboard

This version should feel like a real developer tutorial, not a product tour.

## What the viewer should achieve by the end

By the end of the tutorial, the viewer should be able to:

1. create a workspace
2. add a game
3. install the base Roblox integration correctly
4. understand which events are tracked automatically
5. add real server-side instrumentation to their own game
6. verify that custom events appear in Logs, Players, Analytics, and Health
7. optionally use Live Config and Live Events in real server code

## Recommended audience

- Roblox developers with at least basic Studio knowledge
- teams that want a live ops dashboard plus real in-game instrumentation
- developers who want open-source, self-hostable tooling

## Recommended tutorial length

18 to 25 minutes.

That gives you enough time to show actual code without turning the video into a rushed feature sweep.

## Recommended demo game setup

Do not use a random empty place. Use a simple but believable game scenario with:

- a shop that spends Coins
- one developer product purchase
- one quest or progression loop
- at least one custom gameplay event

That single setup lets you demonstrate:

- `trackEvent`
- `createEconomyTracker`
- `trackRobuxPurchase`
- `withContext`
- `createProgressionTracker`
- dashboard verification after each integration step

## Core tutorial promise

Use wording close to this:

> In this tutorial, I will connect a Roblox game to RblxDash, instrument real gameplay events in server-side Luau, and verify everything end-to-end in the dashboard.

## Important technical framing

Make these points explicit in the tutorial:

- The base install already sends built-in telemetry automatically.
- Custom instrumentation is how you make RblxDash useful for your actual game systems.
- Dashblox calls should happen in server-side code.
- The easiest way to start is the unified script.
- The optional 3-file setup is better if you want a cleaner modular structure across multiple server scripts.

## What the base integration already gives you

Once the Roblox script is installed and the game is live, the base integration already sends:

- `server_started`
- `server_heartbeat`
- `player_join`
- `player_leave`
- `player_session_started`
- `player_session_ended`

It also handles:

- moderation polling for kicks, timeouts, and bans
- moderation result callbacks like `moderation_applied` and `moderation_failed`
- dashboard server commands like shutdown, broadcast, and kick

This matters because your tutorial should explain the difference between:

- built-in telemetry that works after setup
- custom telemetry you add for your own gameplay systems

## Recommended chapter structure

| Time | Chapter | Goal |
| --- | --- | --- |
| 0:00-1:00 | Intro | Define the problem and the outcome |
| 1:00-3:30 | Base setup | Create workspace, add game, install Roblox script |
| 3:30-5:00 | Verify built-in telemetry | Show logs, players, dashboard, validator |
| 5:00-7:00 | Add a custom gameplay event | Use `trackEvent` in real server code |
| 7:00-9:30 | Add economy tracking | Use `createEconomyTracker` for a shop purchase |
| 9:30-12:00 | Add Robux purchase tracking | Use `trackRobuxPurchase` in `ProcessReceipt` |
| 12:00-14:30 | Add progression tracking | Use `withContext` and `createProgressionTracker` |
| 14:30-16:00 | Verify data in the dashboard | Show how the code appears in logs and analytics |
| 16:00-18:00 | Live Config in real server code | Show runtime parameter usage |
| 18:00-20:00 | Live Events in real server code | Show event-driven runtime logic |
| 20:00-21:30 | Optional advanced setup | Mention the 3-file layout |
| 21:30-23:00 | Docs, GitHub, and next steps | Close with open-source and community angle |

## Full tutorial script

## 1. Intro

### What to say

"In this tutorial, I am going to set up RblxDash on a Roblox game, then go beyond the dashboard and actually instrument the game with real server-side code."

"The goal is not just to install the product. The goal is to make it useful in a real project by tracking gameplay events, economy activity, Robux purchases, progression, and optional runtime systems like Live Config and Live Events."

### What to show

- landing page or dashboard overview
- quick flashes of Logs, Players, Analytics, Live Config, and Live Events

## 2. Base setup

### What to say

"The quickest way to start is the unified Roblox script. That gets the base telemetry online fast, and it is the right starting point for most developers."

"From the dashboard, create a workspace, add your game, open the setup guide, copy the generated server script, paste it into ServerScriptService, enable HTTP requests, publish, and join the game once."

### What to show

- workspace creation
- `Games -> Add game`
- setup guide
- copy script button
- Roblox Studio
- `ServerScriptService`
- new `Script`
- paste the generated script
- `Home -> Game Settings -> Security`
- enable `Allow HTTP Requests`
- publish
- join the game

### Technical note to say out loud

"Make sure this is a normal Script in ServerScriptService. If you use a ModuleScript by mistake, nothing will execute automatically."

## 3. Verify built-in telemetry

### What to say

"Before adding custom instrumentation, I want to prove the base integration is working. RblxDash already tracks server lifecycle and player presence automatically."

"So after joining the game, I should be able to see logs, a player entry, at least one live server, and a clean setup validator."

### What to show

- setup validator
- `Logs` with a recent `player_join`
- `Players` with your test player
- `Dashboard` or `Health`
- `Servers`

### What to say if something is wrong

"If this step fails, stop here and fix setup first. The most common issue is HTTP requests not being enabled."

## 4. Add a real custom gameplay event

### What to say

"Now I want to track something game-specific. This is where RblxDash starts becoming useful beyond the default telemetry."

"For a first example, I will track a custom gameplay event from server code."

### What to show

- a server script inside your game
- requiring `Dashblox`
- triggering the event from a real server-side action

### Code to show

```lua
local ServerScriptService = game:GetService("ServerScriptService")
local Dashblox = require(ServerScriptService:WaitForChild("Dashblox"))

Dashblox.trackEvent(player, "quest_completed", {
    questId  = "starter_01",
    xpGained = 100,
})
```

### What to explain

- `trackEvent` is the generic starting point
- event names should be stable and meaningful
- payloads should stay small and structured
- this is server-side instrumentation, not client-only instrumentation

### Verification step

Show the event in:

- `Logs`
- the player profile if relevant

## 5. Add economy tracking for a real shop purchase

### What to say

"For shop and economy flows, I do not want to manually rebuild the same payload shape every time. This is where reusable trackers help."

### What to show

- a `ShopService.server.lua` or equivalent
- a purchase handler
- the tracker being called inside the real shop code path

### Code to show

```lua
local ServerScriptService = game:GetService("ServerScriptService")
local Dashblox = require(ServerScriptService:WaitForChild("Dashblox"))

local spendCoins = Dashblox.createEconomyTracker("sink", "Coins")

spendCoins(player, 150, {
    itemId   = "speed_coil",
    itemName = "Speed Coil",
    shopId   = "main_shop",
})
```

### What to explain

- use `source` and `sink` consistently
- keep currency names stable, for example `Coins`, `Gems`, or `Robux`
- add identifiers like `itemId`, `shopId`, or `entry` so analytics stay useful later

### Verification step

Show where the event appears:

- `Logs`
- `Analytics`, especially economy-related views

## 6. Add Robux purchase tracking the correct way

### What to say

"Robux purchase tracking should happen only after the purchase is actually confirmed. In Roblox, the cleanest place for developer products is usually `ProcessReceipt`."

### What to show

- `MarketplaceService.ProcessReceipt`
- reward logic first
- tracking call after the purchase is confirmed

### Code to show

```lua
local MarketplaceService = game:GetService("MarketplaceService")
local Players = game:GetService("Players")
local ServerScriptService = game:GetService("ServerScriptService")
local Dashblox = require(ServerScriptService:WaitForChild("Dashblox"))

MarketplaceService.ProcessReceipt = function(receiptInfo)
    local player = Players:GetPlayerByUserId(receiptInfo.PlayerId)
    if not player then
        return Enum.ProductPurchaseDecision.NotProcessedYet
    end

    -- your reward logic here

    Dashblox.trackRobuxPurchase(player, "developer_product", 99, {
        productId   = receiptInfo.ProductId,
        receiptId   = receiptInfo.PurchaseId,
        productName = "Starter Pack",
    })

    return Enum.ProductPurchaseDecision.PurchaseGranted
end
```

### What to explain

- `trackRobuxPurchase` is the right helper for Robux monetization events
- do not fire it before the purchase is actually granted
- always include useful identifiers like `productId` and `receiptId`

### Optional extra example to mention

"If you also want to track game pass purchases, use a server-side confirmation flow after the client purchase prompt finishes."

## 7. Add progression tracking with context

### What to say

"Once you start tracking more than one system, you want structure. Context lets you namespace a whole feature area like quests, pets, crafting, or raids."

### What to show

- a `QuestAnalytics` or `QuestService` script
- one context per system
- progression trackers for started, progressed, and completed states

### Code to show

```lua
local ServerScriptService = game:GetService("ServerScriptService")
local Dashblox = require(ServerScriptService:WaitForChild("Dashblox"))

local QuestContext = Dashblox.withContext({
    system = "quests",
})

local TrackQuestStarted = QuestContext.createProgressionTracker("quest_started")
local TrackQuestProgressed = QuestContext.createProgressionTracker("quest_progressed")
local TrackQuestCompleted = QuestContext.createProgressionTracker("quest_completed")

TrackQuestStarted(player, {
    questId = "starter_01",
})

TrackQuestProgressed(player, {
    questId = "starter_01",
    step = "collect_wood",
})

TrackQuestCompleted(player, {
    questId = "starter_01",
    xp = 100,
})
```

### What to explain

- `withContext` keeps payloads consistent across a system
- `createProgressionTracker` is cleaner than repeating manual payloads
- use this pattern for quests, tutorials, battle passes, achievements, or onboarding flows

### Verification step

Show:

- new log events
- progression-related charts or analytics where relevant

## 8. Show how the code maps back to the dashboard

### What to say

"At this point, the important part is not just that data arrives. It is that the data remains understandable once you are back in the dashboard."

"So I want to verify that the event names, payloads, player context, and economy signals I added in code now show up in a way that is actually useful for operating the game."

### What to show

- `Logs`
- `Players`
- `Analytics`
- `Health` if the game is active

### What to explain

- why naming consistency matters
- why stable payload keys matter
- why one tracker per system usually scales better than ad hoc event calls everywhere

## 9. Add Live Config in real server code

### What to say

"Now I want to move from analytics to runtime control. Live Config is useful when you want to adjust game parameters without republishing every small change."

"This is an optional add-on, so for this part I am showing a real usage pattern in server code."

### What to show

- the Live Config module installed in `ServerScriptService`
- the dashboard config page
- a server script reading values from the module

### Code to show

```lua
local ServerScriptService = game:GetService("ServerScriptService")
local LiveConfig = require(ServerScriptService:WaitForChild("RblxDashLiveConfig"))

local maxPlayers = LiveConfig.get("game.maxPlayers", 12)
local difficulty = LiveConfig.get("game.difficulty", "normal")

LiveConfig.onChanged:Connect(function(newConfig, oldConfig)
    print("Config updated to version", LiveConfig.getVersion())
end)
```

### What to explain

- this module is optional
- it supports live updates with MessagingService when available
- it also has a polling fallback
- use it for tuning values, feature flags, rotations, and temporary adjustments

### Verification step

- change a config value in the dashboard
- show the change being consumed in server code

## 10. Add Live Events in real server code

### What to say

"Live Events is the runtime equivalent for event scheduling and activation. This is useful for one-time events, recurring events, and always-on seasonal or promotional logic."

### What to show

- the Live Events module installed in `ServerScriptService`
- the dashboard event page
- a server script checking active events

### Code to show

```lua
local ServerScriptService = game:GetService("ServerScriptService")
local LiveEvents = require(ServerScriptService:WaitForChild("RblxDashLiveEvents"))

local halloween = LiveEvents.get("halloween-2026")
if halloween then
    print("Event active:", halloween.name)
    print("Data:", halloween.data)
end

LiveEvents.onChanged:Connect(function(activeEvents, previousEvents)
    print("Events updated to v" .. tostring(LiveEvents.getVersion()))
end)
```

### What to explain

- this module is optional
- it is meant for runtime-controlled event logic
- it supports live refresh behavior plus fallback polling
- it is a good fit for weekend boosts, live ops rotations, seasonal events, and limited-time content

## 11. Mention the optional advanced 3-file setup

### What to say

"If you want a cleaner modular structure, especially across multiple server scripts, RblxDash also supports an optional 3-file setup."

"That setup separates the runtime, the helper module, and the bootstrap script, which can be easier to maintain in larger projects."

### What to show

- the advanced section in the setup guide
- `DashbloxRuntime`
- `Dashblox`
- bootstrap script

### Recommendation

Say this clearly:

"For most people, start with the unified script. Move to the 3-file setup only once you want stricter code organization."

## 12. Docs, GitHub, and next steps

### What to say

"At this point you have both sides working: the dashboard side and the game code side."

"You can keep instrumenting more systems, use the docs as your SDK reference, and if you want full control, the project is open-source and can be self-hosted."

"The long-term goal is to keep improving the project with the community, so feedback, issues, and contributions are all useful."

### What to show

- developer docs
- GitHub repository
- hosted app

## Important technical notes to include somewhere in the video

## Server-only rule

Say this explicitly:

"Dashblox should be called from server scripts. If the action starts on the client, like a purchase prompt, hand the confirmed result back to the server before calling Dashblox."

## Naming discipline

Recommend:

- stable event names
- stable currency names
- stable payload keys
- one context per major game system

## Keep payloads useful

Good payload fields:

- `questId`
- `itemId`
- `productId`
- `shopId`
- `matchId`
- `step`
- `result`

Bad payload practice:

- huge nested tables
- random one-off key names
- client-only values you never verify

## Practical file layout to show in Studio

Use a clean demo structure so viewers can follow it:

- `ServerScriptService/DashbloxBootstrap`
- `ServerScriptService/ShopService.server.lua`
- `ServerScriptService/DeveloperProducts.server.lua`
- `ServerScriptService/QuestService.server.lua`
- `ServerScriptService/GameplayAnalytics.server.lua`
- optional `ServerScriptService/RblxDashLiveConfig`
- optional `ServerScriptService/RblxDashLiveEvents`

## Title ideas

- Full technical RblxDash tutorial for Roblox games
- How to instrument a real Roblox game with RblxDash
- RblxDash technical setup: logs, analytics, economy, Robux, config, and events

## Description template

In this technical tutorial, I set up RblxDash on a Roblox game and then integrate it into real server-side Luau code. We cover the base install, built-in telemetry, custom events, economy tracking, Robux purchases, progression tracking, Live Config, Live Events, and the optional advanced setup.

Hosted version: `https://rblxdash.com`
Source code: `https://github.com/misericorde0712/RblxDash`

## Final CTA

- Try the hosted version
- Read the docs
- Explore the GitHub repo
- Share feedback or contribute
