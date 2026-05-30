import React from "react"
import ChampionsGallery from "../components/ChampionsGallery"
import Teams from "./Teams"

export default function Home() {
  return (
    <div style={{ paddingBottom: 40 }}>
      <Teams />
      <div style={{ marginTop: 20 }}>
        <ChampionsGallery />
      </div>
    </div>
  )
}

