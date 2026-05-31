// Frontend helper utilities (optional).
// This file is intentionally framework-agnostic so it can be reused anywhere.

export const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api`

export function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "")
  const p = String(path || "").replace(/^\/+/, "")
  return `${b}/${p}`
}

export async function fetchJson(path, { method = "GET", body, headers } = {}) {
  const url = joinUrl(API_BASE_URL, path)
  const res = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(headers || {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = null
  }

  if (!res.ok) {
    const msg = json?.error || `Request failed (${res.status})`
    const details = json?.details ? `: ${json.details}` : ""
    throw new Error(`${msg}${details}`)
  }

  return json
}

