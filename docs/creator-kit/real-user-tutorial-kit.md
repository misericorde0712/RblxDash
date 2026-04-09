# Real User Tutorial Kit

## Goal

Create a tutorial that feels like a real first-time user experience.

The viewer should feel like they are watching a real customer:

1. sign up
2. create a workspace
3. connect a game
4. install the Roblox script
5. verify the setup
6. start using the product immediately

This version should feel practical, simple, and believable.

## Why this version works better for a first public tutorial

Most people do not need advanced instrumentation on the first watch.

What they need first is confidence that:

- setup is straightforward
- the product gives value quickly
- the dashboard is useful on day one
- they can understand where to go next

That is why this tutorial should feel like:

> "Here is exactly what I would do if I were a real new RblxDash user setting up my Roblox game today."

## Viewer outcome

By the end of the tutorial, the viewer should be able to:

1. create a workspace
2. add a Roblox game
3. install the generated script correctly
4. verify that telemetry is coming in
5. navigate the main product surfaces with confidence
6. understand how to use Live Config and Live Events at a practical level

## Recommended length

10 to 15 minutes.

That is enough to feel useful without overwhelming the viewer.

## Recommended framing

Use this exact positioning:

> In this tutorial, I am going to use RblxDash the same way a real user would: from first setup to seeing live data in the dashboard and using the main features that matter on day one.

## What to avoid

For this version, avoid turning it into:

- a technical SDK deep dive
- a code architecture tutorial
- a feature dump
- a pricing pitch

The whole point is to look like a real customer getting real value fast.

## Recommended chapter structure

| Time | Chapter | Goal |
| --- | --- | --- |
| 0:00-0:45 | Intro | Explain what the viewer will get |
| 0:45-1:30 | Create workspace | Start like a real new user |
| 1:30-2:45 | Add game | Connect a real Roblox game |
| 2:45-4:45 | Install script in Studio | Show the exact setup flow |
| 4:45-5:45 | Verify the connection | Confirm logs, players, and live server data |
| 5:45-7:00 | Dashboard, Health, Servers | Show the first practical value |
| 7:00-8:15 | Logs and Players | Show investigation workflow |
| 8:15-9:15 | Moderation | Show how user actions fit into the same flow |
| 9:15-10:15 | Analytics | Show how the product becomes more useful over time |
| 10:15-11:15 | Live Config | Show a practical runtime change |
| 11:15-12:15 | Live Events | Show practical event control |
| 12:15-13:00 | Settings, Docs, GitHub | Show where users go next |
| 13:00-13:30 | Close | Reinforce the product value simply |

## Demo setup recommendation

The tutorial should look like a clean first-use session, but still avoid empty screens.

Prepare:

- one demo workspace
- one demo Roblox game already ready to publish
- one test player account if possible
- some real logs and player activity ready to appear
- a few analytics data points so charts are not empty
- at least one Live Config key and one Live Event entry ready for the demo

## Full tutorial script

## 1. Intro

### What to say

"In this video, I am going to set up RblxDash the same way a real user would, starting from the dashboard, connecting a Roblox game, verifying the setup, and then using the main features that matter first."

"The goal here is simple: manage your Roblox game from one place, simply and quickly, with live visibility into what is happening right now."

### What to show

- landing page or dashboard
- very quick flashes of Logs, Players, Analytics, Live Config, and Live Events

## 2. Create a workspace

### What to say

"The first step is creating a workspace. This is the main space where your game, your team, and your dashboard data live."

"If you are using RblxDash for the first time, this is the natural place to start."

### What to show

- onboarding
- workspace creation

## 3. Add a game

### What to say

"Once the workspace is ready, the next step is adding a Roblox game."

"You can connect a game from your Roblox account flow or enter the game details manually, depending on how you want to set things up."

"For a real user, this is the point where the product starts becoming specific to your game instead of just being an empty dashboard."

### What to show

- `Games -> Add game`
- game name
- Place ID
- Universe ID if needed
- module selection if visible
- successful game creation

## 4. Install the Roblox script

### What to say

"After the game is created, RblxDash gives me the setup guide and the Roblox script I need to install."

"This is the core setup flow: copy the generated script, paste it into ServerScriptService, enable HTTP requests in Roblox Studio, publish the game, and join once."

### What to show

- setup guide
- copy script button
- Roblox Studio
- `ServerScriptService`
- create a new `Script`
- paste the generated script
- `Home -> Game Settings -> Security`
- enable `Allow HTTP Requests`
- publish
- join the game

### Important line to say

"If you do this part correctly, RblxDash should start receiving the built-in game signals automatically."

## 5. Verify the connection

### What to say

"Now I want to check that the setup actually worked."

"As a real user, this is the first moment where I want proof that the product is connected and useful."

"So I am looking for three things: a green setup validator, recent logs, and live player or server data."

### What to show

- setup validator
- `Logs` with `player_join`
- `Players`
- `Dashboard`
- `Servers`

### Important line to say

"If this step fails, the first thing to check is whether HTTP requests are enabled and whether the game was published after that setting was turned on."

## 6. Dashboard, Health, and Servers

### What to say

"Once the game is connected, this is where the product starts paying off immediately."

"The dashboard gives me a quick overview, Health tells me if something looks off, and Servers shows me the live server state."

"This is the kind of information you normally end up checking across multiple places, so having it here in one place is the first real quality-of-life win."

### What to show

- dashboard overview
- health page
- live servers page

## 7. Logs and Players

### What to say

"If I want to understand what just happened in the game, I move into Logs and Players."

"Logs give me the event flow, and Players gives me the user context behind those events."

"That is useful because it moves the workflow from guessing to actually investigating."

### What to show

- open a recent log event
- open a player profile
- show join history, session info, notes, or recent activity if available

## 8. Moderation

### What to say

"Moderation fits into the same workflow."

"Instead of switching to a separate tool, I can review player context and moderation actions in the same product."

"Even if I am not using moderation every day, it matters that it is part of the same ops workflow."

### What to show

- moderation page
- a historical action
- delivery state if visible

## 9. Analytics

### What to say

"Analytics become more useful the longer the game is connected, but even early on this is where I start getting a better picture of activity, monetization, economy, and progression."

"For a real user, the important thing is not just that charts exist. It is that they are in the same place as the rest of the game operations workflow."

### What to show

- activity view
- monetization view
- economy view
- progression view

## 10. Live Config

### What to say

"Live Config is one of the most practical runtime features because it lets me change certain game values from the dashboard without republishing every small adjustment."

"From a real user perspective, this is where the product starts feeling operational rather than just observational."

### What to show

- Live Config page
- existing keys
- edit a key
- optionally show the effect in game if you have a visible demo hook

### Practical examples to mention

- multipliers
- feature flags
- difficulty values
- temporary tuning changes

## 11. Live Events

### What to say

"Live Events gives me the same kind of control for event scheduling and event state."

"This is useful for one-time events, recurring events, seasonal content, or always-on event logic controlled from the dashboard."

### What to show

- Live Events page
- one-time event
- recurring event
- always-on event
- JSON event data

## 12. Settings, Docs, and GitHub

### What to say

"Once the game is set up and the main workflow is clear, the next places I would look as a real user are Settings, the docs, and the GitHub repo."

"Settings is where I manage my workspace and team setup. The docs help me go deeper. And the GitHub repo matters because the project is open-source and can be self-hosted."

### What to show

- settings
- notifications or team section
- docs
- GitHub repository

## 13. Close

### What to say

"So that is the real first-user flow for RblxDash."

"Create a workspace, add your game, install the script, verify the connection, and then start using the dashboard like an actual operations tool instead of bouncing between multiple places."

"If you want to go deeper later, you can explore the docs, the advanced setup, and the open-source repo, but this is the workflow I would start with as a real user."

## Why this tutorial converts well

This version works because it answers the real questions new users actually have:

- How do I start?
- How hard is setup?
- What do I see first?
- What is useful right away?
- Where do I go next?

## Title ideas

- RblxDash Tutorial: setting up your Roblox game as a real user
- How to use RblxDash for your Roblox game
- RblxDash first-time setup and walkthrough
- Setting up RblxDash on a Roblox game from scratch

## Description template

In this tutorial, I walk through RblxDash the same way a real new user would: creating a workspace, adding a game, installing the Roblox setup script, verifying the connection, and using the main dashboard features like Logs, Players, Analytics, Live Config, and Live Events.

Hosted version: `https://rblxdash.com`
Source code: `https://github.com/misericorde0712/RblxDash`

## Final CTA

- Try the hosted version
- Read the docs if you want to go deeper
- Explore the open-source repo
- Share feedback and feature requests
