export type CustomTrackerKind = "event" | "progression" | "economy"
export type EconomyFlowType = "source" | "sink"

export type CustomModuleTrackerDefinition = {
  functionName: string
  trackerKind: CustomTrackerKind
  actionName: string
  flowType?: EconomyFlowType
  currency?: string
  entryName?: string
}

export type CustomRobloxModuleInput = {
  moduleName: string
  systemName?: string
  trackers: CustomModuleTrackerDefinition[]
}

function toSnakeCase(value: string) {
  const normalized = value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase()

  return normalized || "custom_event"
}

function toLuaIdentifier(value: string, fallback: string) {
  const normalized = value
    .replace(/[^a-zA-Z0-9_]+/g, "_")
    .replace(/^[^a-zA-Z_]+/, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")

  return normalized || fallback
}

function toPascalCase(value: string) {
  return toSnakeCase(value)
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}

function escapeLuaString(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n")
    .replace(/"/g, '\\"')
}

export function getSuggestedSystemName(moduleName: string) {
  return toSnakeCase(moduleName.replace(/analytics$/i, ""))
}

export function buildCustomRobloxModuleScript(input: CustomRobloxModuleInput) {
  const moduleName = toLuaIdentifier(input.moduleName, "CustomAnalytics")
  const systemName = toSnakeCase(
    input.systemName && input.systemName.trim() !== ""
      ? input.systemName
      : getSuggestedSystemName(moduleName)
  )
  const trackers = input.trackers.filter(
    (tracker) => tracker.functionName.trim() !== "" && tracker.actionName.trim() !== ""
  )

  const lines = [
    'local ServerScriptService = game:GetService("ServerScriptService")',
    'local Dashblox = require(ServerScriptService:WaitForChild("Dashblox"))',
    "",
    `local ${moduleName} = {}`,
    "",
    `local ${moduleName}Context = Dashblox.withContext({`,
    `    system = "${escapeLuaString(systemName)}",`,
    "})",
    "",
  ]

  if (trackers.length === 0) {
    lines.push("-- Add trackers with the generator in Dashblox.", "", `return ${moduleName}`)
    return lines.join("\n")
  }

  for (const tracker of trackers) {
    const functionName = toLuaIdentifier(tracker.functionName, "trackAction")
    const trackerVariable = `Track${toPascalCase(functionName)}`
    const actionName = toSnakeCase(tracker.actionName)

    if (tracker.trackerKind === "economy") {
      const flowType = tracker.flowType ?? "sink"
      const currency = escapeLuaString(tracker.currency?.trim() || "Coins")
      const entryName = escapeLuaString(
        tracker.entryName?.trim() || actionName
      )

      lines.push(
        `local ${trackerVariable} = ${moduleName}Context.createEconomyTracker("${flowType}", "${currency}", {`,
        `    entry = "${entryName}",`,
        "})"
      )
    } else if (tracker.trackerKind === "progression") {
      lines.push(
        `local ${trackerVariable} = ${moduleName}Context.createProgressionTracker("${escapeLuaString(actionName)}")`
      )
    } else {
      lines.push(
        `local ${trackerVariable} = ${moduleName}Context.createEventTracker("${escapeLuaString(actionName)}")`
      )
    }
  }

  lines.push("")

  for (const tracker of trackers) {
    const functionName = toLuaIdentifier(tracker.functionName, "trackAction")
    const trackerVariable = `Track${toPascalCase(functionName)}`

    if (tracker.trackerKind === "economy") {
      lines.push(
        `function ${moduleName}.${functionName}(player, amount, payload)`,
        `    return ${trackerVariable}(player, amount, payload)`,
        "end",
        ""
      )
    } else {
      lines.push(
        `function ${moduleName}.${functionName}(player, payload)`,
        `    return ${trackerVariable}(player, payload)`,
        "end",
        ""
      )
    }
  }

  lines.push(`return ${moduleName}`)

  return lines.join("\n")
}
