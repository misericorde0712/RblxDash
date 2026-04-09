# Technical Tutorial FAQ and Troubleshooting

This file is meant to support the technical tutorial.

Use it for:

1. FAQ blocks in the video description
2. pinned comments
3. support replies
4. DevForum or YouTube follow-up questions

## Core FAQ

### What is RblxDash?

RblxDash is an open-source operations dashboard for Roblox games. It combines live telemetry, player workflows, moderation, analytics, runtime config, and live events in one place.

### Is it open-source?

Yes. The source code is available on GitHub, and the project is meant to keep improving with community feedback and contributions.

### Can I self-host it?

Yes. You can self-host it from the GitHub repo if you want full control over deployment and source-level customization.

### Do I need to self-host it?

No. There is also a hosted version if you want to get started faster.

### Is this only a dashboard, or can I use it in my game code too?

You can and should use it in your game code too. The base script provides built-in telemetry, and the Luau helpers let you instrument your own gameplay systems from server-side scripts.

## Integration questions

### What does the base Roblox integration send automatically?

The base install already covers:

- `server_started`
- `server_heartbeat`
- `player_join`
- `player_leave`
- `player_session_started`
- `player_session_ended`

It also handles moderation polling and dashboard server commands.

### When do I need custom instrumentation?

As soon as you want meaningful gameplay analytics. The base install gives you connectivity and operational telemetry. Your own game systems still need custom events and trackers.

### Can LocalScripts call Dashblox directly?

No. Treat Dashblox as a server-side integration. If the action starts on the client, confirm it on the server first and call Dashblox from there.

### Should I start with the unified script or the advanced 3-file setup?

Start with the unified script unless you already know you want a more modular multi-file structure. The advanced setup is better for larger projects with more organized server architecture.

### When should I call `trackRobuxPurchase`?

Only after the purchase is actually confirmed and your reward logic is ready to complete. For developer products, that usually means inside `ProcessReceipt`.

### How should I organize event tracking in a real game?

A good pattern is:

- one analytics or service script per game system
- use `trackEvent` for flexible custom events
- use `createEconomyTracker` for currencies and shop flows
- use `withContext` to namespace a feature area
- use `createProgressionTracker` for quests, tutorials, or staged progression

### What are good examples of systems to instrument first?

Start with:

1. shop purchases
2. quest or tutorial progression
3. developer product purchases
4. one or two custom gameplay milestones

## Live Config and Live Events questions

### Do Live Config and Live Events require extra setup?

Yes. They are optional add-ons and should be installed as separate ModuleScripts in `ServerScriptService`.

### Are Live Config updates instant?

Present it this way:

Live Config supports live updates with MessagingService when available, with polling fallback as a safety net.

### Are Live Events updates instant?

Present it this way:

Live Events are built for runtime-controlled event logic, with live refresh behavior and fallback polling rather than a hard guarantee of zero-delay updates in every environment.

### What should I use Live Config for?

Good use cases:

- feature flags
- tuning values
- balancing knobs
- limited-time multipliers
- rotating store content

### What should I use Live Events for?

Good use cases:

- weekend events
- seasonal activations
- one-time live ops moments
- recurring bonus windows
- event payloads with custom JSON data

## Troubleshooting

### Nothing shows up after install

Check these in order:

1. the script is in `ServerScriptService`
2. it is a `Script`, not a `ModuleScript`
3. `Allow HTTP Requests` is enabled
4. the game was published after enabling HTTP
5. you joined the live game at least once

### Logs are empty

Most common causes:

- HTTP requests are disabled
- the script is in the wrong place
- the game was not republished
- you only tested in a way that did not hit the live integration path

### Players page is empty

The Players page needs real player-related events. Join the game, trigger a real session, then refresh the dashboard.

### My custom code runs but I do not see the event

Check:

1. the code is running on the server
2. the `Dashblox` require path is correct
3. the code path is actually being hit
4. the player value is valid at the time of the call
5. the base integration was already verified before adding custom code

### `trackRobuxPurchase` is not appearing correctly

Check:

1. the purchase was actually granted
2. the tracking call happens after confirmation
3. you passed a real player object
4. your payload identifiers like `productId` are valid

### Live Config does not seem to update

Check:

1. the add-on ModuleScript is installed
2. the require path is correct
3. the config key exists in the dashboard
4. you are not expecting every environment to behave like instant MessagingService delivery

### Live Events do not seem to update

Check:

1. the add-on ModuleScript is installed
2. the event is active or scheduled as expected
3. the slug you request matches the dashboard entry
4. you account for fallback polling behavior

## Short support replies you can reuse

### Reply 1

The base install gives you connectivity and built-in telemetry. The real value comes when you start instrumenting your own systems with server-side events and trackers.

### Reply 2

If setup looks broken, check HTTP requests first. That is still the most common issue by far.

### Reply 3

Use the unified setup to start. Move to the advanced 3-file layout only if you want cleaner modular structure across multiple server scripts.

### Reply 4

For Robux purchases, only track them after the purchase is actually confirmed, usually in `ProcessReceipt`.

### Reply 5

Live Config and Live Events are optional runtime add-ons. They are great once the base telemetry and instrumentation are already working.

## FAQ block for the video description

**Is RblxDash open-source?**  
Yes.

**Can I self-host it?**  
Yes.

**Does the base script already track anything?**  
Yes. It already tracks server and player lifecycle telemetry.

**Can I instrument my own game systems too?**  
Yes. That is the main technical workflow after setup.

**Do Live Config and Live Events need extra modules?**  
Yes, they are optional add-ons.

**Should I call Dashblox from LocalScripts?**  
No. Use server-side scripts for the actual Dashblox calls.

## Publishing advice

- lead with the real game integration angle
- mention open-source early
- show dashboard verification after every code step
- keep reminding viewers which parts are built-in vs custom
- do not let the tutorial become just a UI walkthrough
