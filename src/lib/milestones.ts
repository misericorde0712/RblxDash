export type Milestone = {
  id: string
  title: string
  description: string
}

export function getMilestones(stats: {
  totalPlayers: number
  totalSanctions: number
  totalEvents: number
  gamesCount: number
}): Milestone[] {
  const milestones: Milestone[] = []

  if (stats.totalSanctions >= 1) {
    milestones.push({
      id: "first-sanction",
      title: "First sanction issued!",
      description: "You're actively moderating your game. Your players will thank you.",
    })
  }

  if (stats.totalPlayers >= 100) {
    milestones.push({
      id: "100-players",
      title: "100 players tracked!",
      description: "Your game is growing. Keep tracking and analyzing player behavior.",
    })
  }

  if (stats.totalPlayers >= 1000) {
    milestones.push({
      id: "1000-players",
      title: "1,000 players tracked!",
      description: "You've hit a major milestone. Your analytics are getting serious.",
    })
  }

  if (stats.totalEvents >= 10000) {
    milestones.push({
      id: "10k-events",
      title: "10,000 events logged!",
      description: "That's a lot of data. Your dashboard is working hard for you.",
    })
  }

  if (stats.gamesCount >= 3) {
    milestones.push({
      id: "3-games",
      title: "3 games connected!",
      description: "You're managing a whole portfolio now. Consider the Studio plan for unlimited games.",
    })
  }

  return milestones
}
