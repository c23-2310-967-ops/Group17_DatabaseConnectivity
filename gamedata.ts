import { projectId, publicAnonKey } from "../utils/supabase/info"

export interface PlayerProgress {
  playerId: string
  alias: string
  gamesPlayed: number
  bestScore: number
  totalCorrect: number
  totalCases: number
  casesCompleted: number
  lastPlayedAt?: string
}

export interface LeaderboardEntry {
  playerId: string
  alias: string
  bestScore: number
  gamesPlayed: number
  accuracy: number
  casesCompleted: number
}

export interface SessionSummary {
  score: number
  correct: number
  total: number
  completed: boolean
}

const API_URL = `https://${projectId}.supabase.co/functions/v1/make-server-7a325815`
const PLAYER_ID_KEY = "scam-sense-player-id"
const PROGRESS_KEY = "scam-sense-progress"

function createPlayerId() {
  return globalThis.crypto?.randomUUID?.() ?? `player-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function getPlayerId() {
  const existing = localStorage.getItem(PLAYER_ID_KEY)
  if (existing) return existing
  const playerId = createPlayerId()
  localStorage.setItem(PLAYER_ID_KEY, playerId)
  return playerId
}

export function createDefaultProgress(playerId: string): PlayerProgress {
  return {
    playerId,
    alias: `AGENT-${playerId.replaceAll("-", "").slice(0, 4).toUpperCase()}`,
    gamesPlayed: 0,
    bestScore: 0,
    totalCorrect: 0,
    totalCases: 0,
    casesCompleted: 0,
  }
}

export function getLocalProgress(playerId: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "null") as PlayerProgress | null
    if (saved?.playerId === playerId) return saved
  } catch {
    // A damaged local save should not prevent the game from loading.
  }
  return createDefaultProgress(playerId)
}

function setLocalProgress(progress: PlayerProgress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress))
  return progress
}

function headers() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${publicAnonKey}`,
    apikey: publicAnonKey,
  }
}

export async function loadProgress(playerId: string) {
  const local = getLocalProgress(playerId)
  try {
    const response = await fetch(`${API_URL}/progress/${encodeURIComponent(playerId)}`, { headers: headers() })
    if (!response.ok) throw new Error("Unable to load progress")
    const data = await response.json() as { progress: PlayerProgress | null }
    return { progress: data.progress ? setLocalProgress(data.progress) : local, synced: true }
  } catch {
    return { progress: local, synced: false }
  }
}

export function updateLocalAlias(progress: PlayerProgress, alias: string) {
  return setLocalProgress({ ...progress, alias })
}

export async function saveSession(player: PlayerProgress, session: SessionSummary) {
  const optimistic: PlayerProgress = {
    ...player,
    gamesPlayed: player.gamesPlayed + 1,
    bestScore: Math.max(player.bestScore, session.score),
    totalCorrect: player.totalCorrect + session.correct,
    totalCases: player.totalCases + session.total,
    casesCompleted: player.casesCompleted + (session.completed ? 1 : 0),
    lastPlayedAt: new Date().toISOString(),
  }
  setLocalProgress(optimistic)

  try {
    const response = await fetch(`${API_URL}/sessions`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        playerId: player.playerId,
        alias: player.alias.trim() || createDefaultProgress(player.playerId).alias,
        ...session,
      }),
    })
    if (!response.ok) throw new Error("Unable to save session")
    const data = await response.json() as { progress: PlayerProgress }
    return { progress: setLocalProgress(data.progress), synced: true }
  } catch {
    return { progress: optimistic, synced: false }
  }
}

export async function loadLeaderboard() {
  const response = await fetch(`${API_URL}/leaderboard`, { headers: headers() })
  if (!response.ok) throw new Error("Unable to load leaderboard")
  const data = await response.json() as { leaderboard: LeaderboardEntry[] }
  return data.leaderboard
}
