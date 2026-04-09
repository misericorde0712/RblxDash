# Roblox Demo Files

These files are meant for the technical tutorial.

They are examples you can show directly in Roblox Studio while recording.

## Assumptions

- the base RblxDash Roblox integration is already installed
- HTTP requests are enabled
- the game has been published at least once after setup
- if you want to show Live Config or Live Events, the optional add-on modules are also installed

## Recommended Studio layout

Put these in `ServerScriptService` while recording:

- `DashbloxBootstrap` or your RblxDash unified script
- `GameplayAnalytics` as a `ModuleScript`
- `ShopAnalytics` as a `ModuleScript`
- `QuestAnalytics` as a `ModuleScript`
- `DeveloperProducts` as a `Script`
- optional `LiveConfigExample` as a `Script`
- optional `LiveEventsExample` as a `Script`

## What each file is for

- `GameplayAnalytics.module.luau`
  Custom gameplay events using `trackEvent` and reusable event trackers.

- `ShopAnalytics.module.luau`
  Shop and economy instrumentation using `createEconomyTracker` and Robux helpers.

- `QuestAnalytics.module.luau`
  Progression instrumentation using `withContext` and `createProgressionTracker`.

- `DeveloperProducts.server.luau`
  Realistic `ProcessReceipt` example that tracks successful developer product purchases.

- `LiveConfigExample.server.luau`
  Example of reading runtime config from the dashboard in server code.

- `LiveEventsExample.server.luau`
  Example of reacting to active dashboard-controlled events in server code.

## Important notes for the tutorial

- These are demo-ready examples, not your full game systems.
- Replace IDs, reward logic, and remote bindings with your own production logic.
- `ProcessReceipt` should exist in one authoritative place in your game.
- The optional add-on examples require the `RblxDashLiveConfig` and `RblxDashLiveEvents` modules to be installed.

## Suggested recording order

1. show the base install first
2. show `GameplayAnalytics.module.luau`
3. show `ShopAnalytics.module.luau`
4. show `DeveloperProducts.server.luau`
5. show `QuestAnalytics.module.luau`
6. verify the dashboard after each real action
7. end with `LiveConfigExample.server.luau` and `LiveEventsExample.server.luau`
