import { useEffect, useRef, useState, useCallback } from 'react'
import { WalkEngine, type AgentPosition } from './walk-engine'
import { WalkingAgent } from './walking-agent'
import type { MarketingAgentId, PixelAgentStatus } from '../components/features/agent-monitor/pixel-agents'

interface AgentStatusInfo {
  id: string
  name: string
  status: 'busy' | 'idle'
}

interface TaskInfo {
  assignee_id?: string
  status?: string
}

export function DockPetApp() {
  const [positions, setPositions] = useState<Map<string, AgentPosition>>(new Map())
  const [teamAgentIds, setTeamAgentIds] = useState<string[]>([])
  const [agentNames, setAgentNames] = useState<Map<string, string>>(new Map())
  const [agentStatuses, setAgentStatuses] = useState<Map<string, PixelAgentStatus>>(new Map())
  const engineRef = useRef<WalkEngine | null>(null)

  // Initialize walk engine (once)
  useEffect(() => {
    const width = window.innerWidth
    const engine = new WalkEngine(width, (pos) => {
      setPositions(new Map(pos))
    })
    engine.start()
    engineRef.current = engine

    const onResize = () => engine.setLaneWidth(window.innerWidth)
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      engine.destroy()
    }
  }, [])

  // Load team agents on mount + listen for changes
  useEffect(() => {
    const load = async () => {
      try {
        const res = await window.api.team.getAgents()
        if (res.success && res.data) {
          setTeamAgentIds(res.data)
        }
      } catch {
        setTeamAgentIds(['ceo', 'xhs-agent', 'growth-agent', 'brand-reviewer'])
      }
    }
    load()

    const unsub = window.api.team.onAgentsChanged((ids) => {
      setTeamAgentIds(ids)
    })
    return unsub
  }, [])

  // Sync walk engine when teamAgentIds changes
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    const currentIds = new Set(engine.getAgentIds())
    const targetIds = new Set(teamAgentIds)

    for (const id of teamAgentIds) {
      if (!currentIds.has(id)) {
        engine.addAgent(id)
      }
    }
    for (const id of currentIds) {
      if (!targetIds.has(id)) {
        engine.removeAgent(id)
      }
    }
  }, [teamAgentIds])

  // Poll agent status + review tasks every 3s
  useEffect(() => {
    const poll = async () => {
      try {
        const statusRes = await window.api.agent.status()
        const tasksRes = await window.api.tasks.list({ status: 'review' })

        const statusMap = new Map<string, PixelAgentStatus>()
        const nameMap = new Map<string, string>()

        const reviewAgents = new Set<string>()
        if (tasksRes.success && tasksRes.data) {
          for (const task of tasksRes.data as TaskInfo[]) {
            if (task.assignee_id) {
              reviewAgents.add(task.assignee_id)
            }
          }
        }

        if (statusRes.success && statusRes.data) {
          const data = statusRes.data as { agents: AgentStatusInfo[] }
          for (const a of data.agents) {
            nameMap.set(a.id, a.name)

            if (a.status === 'busy') {
              statusMap.set(a.id, 'busy')
            } else if (reviewAgents.has(a.id)) {
              statusMap.set(a.id, 'review')
            } else {
              statusMap.set(a.id, 'online')
            }
          }
        }

        setAgentStatuses(statusMap)
        setAgentNames(nameMap)
      } catch {
        // ignore
      }
    }

    poll()
    const timer = setInterval(poll, 3000)
    return () => clearInterval(timer)
  }, [])

  // Mouse forwarding
  const handleMouseEnter = useCallback(() => {
    window.api.dockPet.setMouseForward(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    window.api.dockPet.setMouseForward(true)
  }, [])

  // Click agent → show popover
  const handleAgentClick = useCallback((agentId: string, x: number) => {
    window.api.dockPet.showPopover({ agentId, x, y: 0 })
  }, [])

  // Derive short label from agent name
  const getLabel = (id: string): string => {
    const name = agentNames.get(id)
    if (!name) return id
    if (name.length <= 4) return name
    return name.replace(/创作专家|营销专家|制作专家|风控审查|营销总监|分析师/, '').trim() || name.slice(0, 4)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {teamAgentIds.map((id) => {
        const pos = positions.get(id)
        if (!pos) return null
        const status = agentStatuses.get(id) ?? 'online'
        return (
          <WalkingAgent
            key={id}
            agentId={id as MarketingAgentId}
            label={getLabel(id)}
            position={pos}
            status={status}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={handleAgentClick}
          />
        )
      })}
    </div>
  )
}
