import React from 'react'
import { createRoot } from 'react-dom/client'
import '../dock-pet.css'
import { DockPetApp } from './dock-pet-app'

const root = document.getElementById('dock-pet-root')!
createRoot(root).render(
  <React.StrictMode>
    <DockPetApp />
  </React.StrictMode>
)
