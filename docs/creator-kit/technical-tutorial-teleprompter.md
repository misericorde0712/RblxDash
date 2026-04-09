# Technical Tutorial Teleprompter

This is the technical variant.

If you want a more realistic first-user walkthrough, use `real-user-tutorial-teleprompter.md` instead.

Use this as the spoken version of the tutorial.

It is written in English and designed to be recorded as a clean post-produced voice-over.

## Recording notes

- speak at roughly 140 to 160 words per minute
- pause briefly after every code reveal
- keep the screen moving while the voice explains the result
- if a section feels too long, cut examples before cutting the setup or verification steps

## Intro

Today I am going to set up RblxDash on a Roblox game and then use it in real server-side Luau code.

The goal here is not just to install a dashboard.

The goal is to connect a game, verify the built-in telemetry, and then add actual instrumentation for gameplay, economy, Robux purchases, progression, and optional runtime systems like Live Config and Live Events.

By the end of the video, you should know how to use RblxDash both in the dashboard and in your game code.

## Base setup

I am starting with the standard setup flow.

First I create a workspace, then I add my Roblox game, and then I open the setup guide.

RblxDash generates a Roblox server script for the selected game, with the webhook URL and secret already embedded.

I copy that script, open Roblox Studio, go to ServerScriptService, create a normal Script, and paste it in.

Then I open Home, Game Settings, Security, and enable Allow HTTP Requests.

After that I publish the game and join it once.

That is enough to get the base connection online.

## Verify built-in telemetry

Before I add any custom code, I want to confirm the base integration works.

At this point, RblxDash should already start receiving the built-in telemetry from the game.

That includes server lifecycle and player presence events like server started, server heartbeat, player join, player leave, session started, and session ended.

Back in the dashboard, I check the setup validator, the Logs page, the Players page, and the live server state.

If this step is not working, stop here and fix setup first.

The most common issue is still HTTP requests not being enabled or not publishing the game after enabling them.

## Custom gameplay event

Now that the base telemetry is confirmed, I can start adding game-specific instrumentation.

For the first example, I am adding a custom gameplay event from server-side code.

I require Dashblox from ServerScriptService, and then I call trackEvent with a stable event name and a small structured payload.

This is the generic pattern you use any time you want to record a meaningful action that is specific to your game.

For example, I can track a quest completion, a crafted item, a match result, or any other milestone that matters to me.

Once I trigger that action in the game, I go back to Logs and verify that the event appears with the expected payload.

## Economy tracking

Next, I want to track a real economy action.

Instead of manually building a currency payload every time, I create a reusable economy tracker.

Here I use createEconomyTracker with the direction set to sink and the currency set to Coins.

Then inside my actual shop purchase flow, I call that tracker when the player spends currency.

This is the kind of thing that becomes useful very quickly because it gives your logs and analytics a more consistent structure.

After triggering the purchase in game, I verify the result in Logs and in the analytics views related to economy.

## Robux purchases

For Robux purchases, the important thing is to track them only after they are actually confirmed.

For developer products, the clean place to do that is usually ProcessReceipt.

So inside ProcessReceipt, after I resolve the player and after my reward logic is ready, I call trackRobuxPurchase with the purchase type, the amount, and useful identifiers like product ID, receipt ID, and product name.

That gives me cleaner monetization data and ties the event to a real player and a real Roblox purchase flow.

Once I have a successful purchase, I verify that the event appears correctly in the dashboard.

## Progression tracking with context

Now I want to show a better pattern for larger systems.

If you are tracking a full quest system or tutorial system, you do not want a bunch of unrelated one-off events with inconsistent payloads.

So here I create a context for quests and then create progression trackers for started, progressed, and completed states.

That keeps the instrumentation cleaner and makes the data easier to understand once it lands in RblxDash.

This same pattern works well for quests, tutorials, achievements, onboarding steps, battle passes, and anything else that follows a staged progression model.

After triggering those steps in game, I verify the events again in Logs and in the analytics surfaces that matter.

## Mapping code back to the dashboard

This is the point where the tutorial should slow down for a second.

It is not enough for data to arrive.

The data needs to stay understandable once you are back in the dashboard.

So I look at the event names, the payload keys, the player context, and the economy labels, and I make sure they are structured in a way that is still useful when I am operating the game later.

This is why naming discipline matters.

Stable event names and stable payload keys will save you a lot of confusion once your game grows.

## Live Config

Now I move into runtime control.

Live Config is an optional add-on that lets the game read values from the dashboard without republishing every small change.

In this example, I require the RblxDashLiveConfig module from ServerScriptService and use it to read values like max players, difficulty, or a temporary multiplier.

I also listen to onChanged so the game can react when config changes arrive.

Then I update one of those values in the dashboard and show the result inside Roblox Studio or through a live server-side print or attribute change.

That makes the value of the add-on very concrete.

## Live Events

Live Events is the equivalent pattern for event scheduling and activation.

This is useful for seasonal content, weekend boosts, scheduled event windows, or always-on runtime logic controlled from the dashboard.

In the example, I require RblxDashLiveEvents, check whether a specific event slug is active, and react to event changes from server-side code.

I also show how custom event data can be read as a Lua table.

Then I activate or edit an event in the dashboard and verify the game reacts to it.

## Optional advanced setup

At this point, I briefly mention the optional 3-file setup.

This is useful if you want the runtime, helper module, and bootstrap separated more cleanly across a larger project.

But for most developers, I still recommend starting with the unified script and moving to the 3-file setup only when code organization becomes a real need.

## Docs, GitHub, and close

At this point, the dashboard side and the code side are both working.

The next step is simply to keep instrumenting more of your real game systems.

If you want the SDK reference, the developer docs are there.

If you want full control, the project is open-source and self-hostable.

And if you want to help improve it, the long-term goal is to keep building it with community feedback and contributions.

## Final close

If you want one place to run your Roblox game simply and quickly, while also instrumenting the game properly from server-side code, RblxDash is built for that.
