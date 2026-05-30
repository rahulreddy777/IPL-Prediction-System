/**
 * socket.js — Singleton WebSocket connection
 * Dispatches custom DOM events so any component can react without coupling.
 */
const socket = new WebSocket("ws://localhost:5000/ws")

socket.onopen = () => {
  console.log("[WS CONNECTED]")
}

socket.onmessage = (event) => {
  let data
  try {
    data = JSON.parse(event.data)
  } catch {
    return
  }

  // Playoff bracket auto-updated (refreshBracket event-driven)
  if (data.type === "PLAYOFF_BRACKET_UPDATE" || data.type === "PLAYOFFS_UPDATED") {
    window.dispatchEvent(new CustomEvent("playoffBracketUpdate", { detail: data }))
    console.log("[PLAYOFF AUTO UPDATED]")
    return
  }

  // A new match just went live (upcoming → live transition)
  if (data.type === "LIVE_MATCH_STARTED") {
    window.dispatchEvent(new CustomEvent("liveMatchStarted", { detail: data }))
    console.log("[LIVE MATCH STARTED] 🔴", data.liveCount, "match(es)")
    return
  }

  // Match finished — results and bracket need refreshing
  if (data.type === "MATCH_COMPLETED") {
    window.dispatchEvent(new CustomEvent("matchCompleted", { detail: data }))
    console.log("[MATCH COMPLETED] 🏆", data.winner)
    return
  }

  // Any live/upcoming count changed
  if (data.type === "MATCH_STATUS_UPDATED") {
    window.dispatchEvent(new CustomEvent("matchStatusUpdated", { detail: data }))
    return
  }

  // Generic score update — pass through
  if (data.type === "LIVE_SCORE_UPDATE" || data.type === "AUTO_REFRESH") {
    window.dispatchEvent(new CustomEvent("liveScoreUpdate", { detail: data }))
    return
  }
}

socket.onclose = () => {
  console.log("[WS CLOSED]")
  setTimeout(() => {
    window.location.reload()
  }, 3000)
}

socket.onerror = (e) => {
  console.log("[WS ERROR]", e)
}

export default socket
