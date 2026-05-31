/**
 * socket.js — Singleton WebSocket connection
 * Dispatches custom DOM events so any component can react without coupling.
 */
let socket = null;

let reconnectTimer = null
let reconnectAttempts = 0

function connectSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return;
  }

  socket = new WebSocket(`${import.meta.env.VITE_WS_URL}`)

  socket.onopen = () => {
    console.log("[WS CONNECTED]")
    reconnectAttempts = 0
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
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
    console.log("[WS CLOSED] Reconnecting silently...")
    // Exponential backoff: 2s, 4s, 8s, max 15s
    const backoff = Math.min(1000 * Math.pow(2, reconnectAttempts), 15000)
    reconnectAttempts++
    
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        connectSocket()
      }, backoff)
    }
  }

  socket.onerror = (e) => {
    console.log("[WS ERROR]", e)
    // onerror is usually followed by onclose, so we let onclose handle reconnection
  }
}

connectSocket()

export default socket
