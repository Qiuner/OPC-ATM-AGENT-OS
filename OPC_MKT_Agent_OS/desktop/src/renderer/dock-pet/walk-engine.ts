/**
 * Walk Engine — lil-agents-style character walking state machine
 *
 * Trapezoidal velocity profile: ease-in → constant → ease-out
 * Each agent walks independently with collision avoidance.
 */

export type WalkPhase = 'idle' | 'pausing' | 'accelerating' | 'cruising' | 'decelerating'

export interface AgentPosition {
  x: number
  bobY: number
  direction: 1 | -1
  isWalking: boolean
  walkFrame: 0 | 1
}

interface AgentWalkState {
  agentId: string
  x: number
  phase: WalkPhase
  direction: 1 | -1
  velocity: number
  maxVelocity: number
  accelDuration: number
  cruiseDuration: number
  decelDuration: number
  phaseFrame: number
  pauseRemaining: number
  bobPhase: number
  walkFrameTimer: number
  walkFrame: 0 | 1
}

export type PositionCallback = (positions: Map<string, AgentPosition>) => void

export class WalkEngine {
  private agents = new Map<string, AgentWalkState>()
  private laneWidth: number
  private margin = 80
  private charWidth = 56
  private rafId: number | null = null
  private callback: PositionCallback
  private lastTime = 0

  constructor(laneWidth: number, callback: PositionCallback) {
    this.laneWidth = laneWidth
    this.callback = callback
  }

  setLaneWidth(w: number): void {
    this.laneWidth = w
  }

  addAgent(agentId: string): void {
    // Spread agents evenly across the lane
    const count = this.agents.size
    const spacing = (this.laneWidth - 2 * this.margin) / 5
    const x = this.margin + spacing * (count + 1)

    this.agents.set(agentId, {
      agentId,
      x,
      phase: 'pausing',
      direction: 1,
      velocity: 0,
      maxVelocity: 0,
      accelDuration: 0,
      cruiseDuration: 0,
      decelDuration: 0,
      phaseFrame: 0,
      pauseRemaining: Math.floor((2 + Math.random() * 4) * 60), // 2-6s initial stagger
      bobPhase: 0,
      walkFrameTimer: 0,
      walkFrame: 0,
    })
  }

  removeAgent(agentId: string): void {
    this.agents.delete(agentId)
  }

  getAgentIds(): string[] {
    return [...this.agents.keys()]
  }

  start(): void {
    this.lastTime = performance.now()
    const tick = (now: number): void => {
      const dt = Math.min((now - this.lastTime) / 1000, 0.05) // cap at 50ms
      this.lastTime = now
      this.update(dt)
      this.emit()
      this.rafId = requestAnimationFrame(tick)
    }
    this.rafId = requestAnimationFrame(tick)
  }

  stop(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  private update(dt: number): void {
    const fps60Frames = dt * 60 // normalize to ~60fps frame count

    for (const state of this.agents.values()) {
      switch (state.phase) {
        case 'idle':
          this.planNextWalk(state)
          break

        case 'pausing':
          state.pauseRemaining -= fps60Frames
          if (state.pauseRemaining <= 0) {
            state.phase = 'idle'
          }
          break

        case 'accelerating': {
          state.phaseFrame += fps60Frames
          const t = state.phaseFrame / state.accelDuration
          state.velocity = state.maxVelocity * Math.min(t, 1)
          state.x += state.velocity * state.direction * dt
          state.bobPhase += dt * 8
          state.walkFrameTimer += dt
          if (state.walkFrameTimer > 0.2) {
            state.walkFrame = state.walkFrame === 0 ? 1 : 0
            state.walkFrameTimer = 0
          }
          if (state.phaseFrame >= state.accelDuration) {
            state.phase = 'cruising'
            state.phaseFrame = 0
          }
          break
        }

        case 'cruising': {
          state.phaseFrame += fps60Frames
          state.velocity = state.maxVelocity
          state.x += state.velocity * state.direction * dt
          state.bobPhase += dt * 10
          state.walkFrameTimer += dt
          if (state.walkFrameTimer > 0.2) {
            state.walkFrame = state.walkFrame === 0 ? 1 : 0
            state.walkFrameTimer = 0
          }
          if (state.phaseFrame >= state.cruiseDuration) {
            state.phase = 'decelerating'
            state.phaseFrame = 0
          }
          break
        }

        case 'decelerating': {
          state.phaseFrame += fps60Frames
          const t = state.phaseFrame / state.decelDuration
          state.velocity = state.maxVelocity * Math.max(1 - t, 0)
          state.x += state.velocity * state.direction * dt
          state.bobPhase += dt * (8 - t * 6)
          state.walkFrameTimer += dt
          if (state.walkFrameTimer > 0.25) {
            state.walkFrame = state.walkFrame === 0 ? 1 : 0
            state.walkFrameTimer = 0
          }
          if (state.phaseFrame >= state.decelDuration) {
            state.phase = 'pausing'
            state.pauseRemaining = (1 + Math.random() * 3) * 60 // 1-4s pause
            state.velocity = 0
            state.bobPhase = 0
            state.walkFrame = 0
          }
          break
        }
      }

      // Boundary clamp
      const minX = this.margin
      const maxX = this.laneWidth - this.margin - this.charWidth
      if (state.x < minX) {
        state.x = minX
        state.direction = 1
      } else if (state.x > maxX) {
        state.x = maxX
        state.direction = -1
      }
    }
  }

  private planNextWalk(state: AgentWalkState): void {
    // Collision avoidance: only one agent walks at a time
    const othersWalking = [...this.agents.values()].some(
      a => a.agentId !== state.agentId &&
        (a.phase === 'accelerating' || a.phase === 'cruising' || a.phase === 'decelerating')
    )
    if (othersWalking) {
      state.phase = 'pausing'
      state.pauseRemaining = (1 + Math.random() * 2) * 60 // wait 1-3s
      return
    }

    // Pick random direction — prefer not hitting boundaries
    const minX = this.margin
    const maxX = this.laneWidth - this.margin - this.charWidth
    if (state.x < minX + 100) {
      state.direction = 1
    } else if (state.x > maxX - 100) {
      state.direction = -1
    } else {
      state.direction = Math.random() > 0.5 ? 1 : -1
    }

    // Random walk parameters
    state.maxVelocity = 50 + Math.random() * 60 // 50-110 px/s
    const distance = 80 + Math.random() * 250  // 80-330 px
    const totalTime = distance / state.maxVelocity // seconds
    const totalFrames = totalTime * 60

    state.accelDuration = Math.max(totalFrames * 0.2, 10)
    state.cruiseDuration = Math.max(totalFrames * 0.6, 15)
    state.decelDuration = Math.max(totalFrames * 0.2, 10)
    state.phaseFrame = 0
    state.phase = 'accelerating'
  }

  private emit(): void {
    const positions = new Map<string, AgentPosition>()
    for (const [id, state] of this.agents) {
      const isWalking = state.phase === 'accelerating' || state.phase === 'cruising' || state.phase === 'decelerating'
      const bobY = isWalking ? Math.sin(state.bobPhase) * 2.5 : 0
      positions.set(id, {
        x: state.x,
        bobY,
        direction: state.direction,
        isWalking,
        walkFrame: state.walkFrame,
      })
    }
    this.callback(positions)
  }

  destroy(): void {
    this.stop()
    this.agents.clear()
  }
}
