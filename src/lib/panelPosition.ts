export type PanelPosition = { x: number; y: number };

export function clampPanelPosition(
  position: PanelPosition,
  bounds: { width: number; height: number },
  panel: { width: number; height: number },
): PanelPosition {
  return {
    x: Math.max(
      0,
      Math.min(position.x, Math.max(0, bounds.width - panel.width)),
    ),
    y: Math.max(
      0,
      Math.min(position.y, Math.max(0, bounds.height - panel.height)),
    ),
  };
}
