import { screen } from 'electron'

export interface DockGeometry {
  /** Dock-pet window position */
  x: number
  y: number
  /** Dock-pet window size (full screen width, ~120px tall) */
  width: number
  height: number
  /** Where the macOS dock is */
  position: 'bottom' | 'left' | 'right'
  /** Estimated dock thickness in px */
  dockSize: number
}

const PET_WINDOW_HEIGHT = 160

/**
 * Detect macOS dock position and calculate dock-pet window placement.
 * Compares display.bounds vs display.workArea to find dock gap.
 */
export function getDockGeometry(): DockGeometry {
  const display = screen.getPrimaryDisplay()
  const { bounds, workArea } = display

  const dockBottom = (bounds.y + bounds.height) - (workArea.y + workArea.height)
  const dockLeft = workArea.x - bounds.x
  const dockRight = (bounds.x + bounds.width) - (workArea.x + workArea.width)

  // Bottom dock (most common)
  if (dockBottom > dockLeft && dockBottom > dockRight) {
    return {
      x: bounds.x,
      y: workArea.y + workArea.height - PET_WINDOW_HEIGHT,
      width: bounds.width,
      height: PET_WINDOW_HEIGHT,
      position: 'bottom',
      dockSize: dockBottom,
    }
  }

  // Left dock
  if (dockLeft > dockRight) {
    return {
      x: bounds.x + dockLeft,
      y: bounds.y + bounds.height - PET_WINDOW_HEIGHT - 70,
      width: bounds.width - dockLeft,
      height: PET_WINDOW_HEIGHT,
      position: 'left',
      dockSize: dockLeft,
    }
  }

  // Right dock
  if (dockRight > 0) {
    return {
      x: bounds.x,
      y: bounds.y + bounds.height - PET_WINDOW_HEIGHT - 70,
      width: bounds.width - dockRight,
      height: PET_WINDOW_HEIGHT,
      position: 'right',
      dockSize: dockRight,
    }
  }

  // Dock auto-hide or not detected — position at bottom with assumed dock
  return {
    x: bounds.x,
    y: bounds.y + bounds.height - PET_WINDOW_HEIGHT - 4,
    width: bounds.width,
    height: PET_WINDOW_HEIGHT,
    position: 'bottom',
    dockSize: 0,
  }
}
