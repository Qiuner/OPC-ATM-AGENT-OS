import React from 'react'
import { createRoot } from 'react-dom/client'
import '../dock-pet.css'
import { ChatPopoverApp } from './chat-popover-app'

const root = document.getElementById('popover-root')!
createRoot(root).render(
  <React.StrictMode>
    <ChatPopoverApp />
  </React.StrictMode>
)
