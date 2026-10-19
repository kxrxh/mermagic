import { expect, test } from "bun:test";
import { clampPanelPosition } from "../src/lib/panelPosition";

const bounds = { width: 800, height: 600 };
const panel = { width: 300, height: 200 };

test("keeps a panel at its in-bounds position", () => {
  expect(clampPanelPosition({ x: 150, y: 100 }, bounds, panel)).toEqual({
    x: 150,
    y: 100,
  });
});

test("clamps negative coordinates and the panel's far edges", () => {
  expect(clampPanelPosition({ x: -20, y: 700 }, bounds, panel)).toEqual({
    x: 0,
    y: 400,
  });
  expect(clampPanelPosition({ x: 900, y: -10 }, bounds, panel)).toEqual({
    x: 500,
    y: 0,
  });
});

test("moves a panel back into a resized preview", () => {
  expect(
    clampPanelPosition({ x: 500, y: 400 }, { width: 450, height: 350 }, panel),
  ).toEqual({ x: 150, y: 150 });
});

test("anchors an oversized panel at the preview origin", () => {
  expect(
    clampPanelPosition({ x: 40, y: 30 }, { width: 100, height: 100 }, panel),
  ).toEqual({ x: 0, y: 0 });
  expect(
    clampPanelPosition({ x: 40, y: 30 }, { width: -100, height: -100 }, panel),
  ).toEqual({ x: 0, y: 0 });
});
