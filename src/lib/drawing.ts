import type { DrawingData, DrawingLabel, EstimateMarker, Wall } from '@/lib/types';

export const CELL_PX = 20;
export const CELL_M = 0.5;
export const GRID_COLS = 60;
export const GRID_ROWS = 40;

export const DRAWING_WIDTH = GRID_COLS * CELL_PX;
export const DRAWING_HEIGHT = GRID_ROWS * CELL_PX;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isWall(value: unknown): value is Wall {
  if (!value || typeof value !== 'object') return false;
  const w = value as Wall;
  return isFiniteNumber(w.x1) && isFiniteNumber(w.y1) && isFiniteNumber(w.x2) && isFiniteNumber(w.y2);
}

function isLabel(value: unknown): value is DrawingLabel {
  if (!value || typeof value !== 'object') return false;
  const l = value as DrawingLabel;
  return isFiniteNumber(l.x) && isFiniteNumber(l.y) && typeof l.text === 'string';
}

function isMarker(value: unknown): value is EstimateMarker {
  if (!value || typeof value !== 'object') return false;
  const m = value as EstimateMarker;
  return isFiniteNumber(m.x) && isFiniteNumber(m.y) && typeof m.title === 'string' && typeof m.id === 'string';
}

export function parseDrawingData(raw: unknown): DrawingData {
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Partial<DrawingData>;
  return {
    walls: Array.isArray(obj.walls) ? obj.walls.filter(isWall) : [],
    labels: Array.isArray(obj.labels) ? obj.labels.filter(isLabel) : [],
    markers: Array.isArray(obj.markers) ? obj.markers.filter(isMarker) : [],
  };
}

export function clampCell(value: number, max: number) {
  return Math.min(max, Math.max(0, Math.round(value)));
}

export function wallLengthM(wall: Wall) {
  return Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1) * CELL_M;
}

export function totalWallLengthM(walls: Wall[]) {
  return walls.reduce((sum, w) => sum + wallLengthM(w), 0);
}

export function formatMeters(value: number) {
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} м`;
}
