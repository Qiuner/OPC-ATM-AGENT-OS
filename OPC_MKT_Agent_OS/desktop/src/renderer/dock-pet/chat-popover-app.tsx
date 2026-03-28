import { useEffect, useState } from 'react'
import { ChatPopover } from './chat-popover'

export function ChatPopoverApp() {
  const [agentId, setAgentId] = useState<string | null>(null)

  useEffect(() => {
    const unsub = window.api.dockPet.onPopoverAgent((data) => {
      setAgentId(data.agentId)
    })
    return unsub
  }, [])

  if (!agentId) {
    return null
  }

  return <ChatPopover agentId={agentId} />
}
