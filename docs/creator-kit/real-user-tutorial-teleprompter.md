# Real User Tutorial Teleprompter

Use this if you want the tutorial to feel like a real first-time customer walkthrough.

This is the version that should usually be your first public tutorial.

## Recording notes

- keep the tone practical and calm
- do not sound like a pitch
- speak like you are showing your own real onboarding flow
- keep moving between screens so the viewer always sees progress

## Intro

In this video, I am going to set up RblxDash the same way a real user would.

I will create a workspace, connect a Roblox game, install the setup script, verify the connection, and then walk through the main parts of the product that matter first.

The idea is simple: manage your Roblox game from one place, simply and quickly, with better live visibility into what is happening in your game.

## Create a workspace

The first step is creating a workspace.

This is the main space where your game, your team, and your dashboard data live.

If you are using RblxDash for the first time, this is the natural starting point.

## Add a game

Once the workspace is ready, I can add a Roblox game.

This is where the product starts becoming specific to my actual game instead of just being an empty dashboard.

I enter the game details, confirm the setup, and then move into the game-specific setup flow.

## Install the Roblox script

Now I open the setup guide and copy the generated Roblox script.

In Roblox Studio, I go to ServerScriptService, create a normal Script, and paste it in.

Then I open Game Settings, go to Security, and enable Allow HTTP Requests.

After that I publish the game and join once.

This is the key setup step, because once this is done correctly, RblxDash can start receiving the built-in telemetry from the game.

## Verify the connection

Now I go back to the dashboard and make sure the connection is actually working.

As a real user, this is the first proof I care about.

I want to see the setup validator turning green, recent logs appearing, a player showing up, and at least one live server signal.

If this part does not work, the first thing I would check is HTTP requests and whether I published the game after enabling them.

## Dashboard, Health, and Servers

Once the game is connected, I can start using the dashboard like a real operations tool.

The dashboard gives me a quick overview.

Health helps me see if something looks wrong.

And Servers gives me the live server state without making me jump between multiple places.

This is usually the first moment where the product starts feeling genuinely useful.

## Logs and Players

If I want to understand what just happened, I move into Logs and Players.

Logs show me the event flow.

Players gives me the actual user context behind those events.

That matters because the workflow becomes much more practical when I can move from an event to a player and understand what is happening without leaving the product.

## Moderation

Moderation fits naturally into the same flow.

If I need to review an action or investigate a user, I can do it here instead of stitching together separate tools.

Even if I am not moderating constantly, it is useful that it is part of the same dashboard workflow.

## Analytics

Analytics become more useful over time as more data comes in, but this is where I start seeing the longer-term value.

I can look at activity, monetization, economy, and progression in the same place where I am already looking at logs, players, and game health.

So the product does not just help me observe the game live.

It also helps me build a broader picture of what is happening over time.

## Live Config

Live Config is one of the most practical runtime features.

It lets me change certain game parameters from the dashboard without republishing every small adjustment.

From a real user perspective, that is valuable because it moves the product from being just informative to being operational.

## Live Events

Live Events does the same kind of thing for event scheduling and event state.

I can create one-time events, recurring events, or always-on event logic, all from the dashboard.

That is useful for seasonal content, limited-time boosts, or any runtime behavior I want to manage more flexibly.

## Settings, Docs, and GitHub

Once I understand the main workflow, the next places I care about are Settings, the docs, and the GitHub repo.

Settings is where I manage the workspace and team side.

The docs are where I go deeper.

And the GitHub repo matters because the project is open-source and can be self-hosted.

## Close

So that is the real first-user flow for RblxDash.

Create a workspace, add a game, install the script, verify the connection, and then start using the dashboard the same way you would use an actual operations tool for your Roblox game.

If you want to go deeper after that, you can explore the docs, the advanced setup, and the open-source repo.

But if I were a real new user, this is exactly the flow I would start with.
