export type ThemeVariables = Record<string, string | boolean | number>;

export type ThemeKind = "modern" | "classic";
export type ThemeLook = "classic" | "neo";

export type DiagramTheme = {
  id: string;
  name: string;
  kind: ThemeKind;
  dark: boolean;
  look: ThemeLook;
  curve: "basis" | "linear";
  background: string;
  swatch: [string, string, string];
  variables: ThemeVariables;
};

function hexToRgb(hex: string): [number, number, number] {
  const raw = hex.replace("#", "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function onColor(bg: string): string {
  return luminance(bg) > 0.42 ? "#1c1917" : "#f8fafc";
}

function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(ar + (br - ar) * t)}${toHex(ag + (bg - ag) * t)}${toHex(ab + (bb - ab) * t)}`;
}

const MODERN_FONT = "DM Sans, ui-sans-serif, system-ui, sans-serif";
const CLASSIC_FONT = "IBM Plex Sans, ui-sans-serif, system-ui, sans-serif";

type Palette = {
  id: string;
  name: string;
  kind: ThemeKind;
  dark: boolean;
  background: string;
  primary: string;
  secondary: string;
  tertiary: string;
  text: string;
  line: string;
  muted: string;
  note: string;
  extras?: string[];
};

function buildTheme(p: Palette): DiagramTheme {
  const classic = p.kind === "classic";
  const primaryText = p.text;
  const secondaryText = p.text;
  const tertiaryText = p.text;
  const cluster = mix(p.background, p.muted, p.dark ? 0.18 : 0.12);
  const border = mix(p.line, p.primary, classic ? 0.22 : 0.38);
  const extras = p.extras ?? [
    p.primary,
    p.secondary,
    p.tertiary,
    p.note,
    p.line,
    p.muted,
  ];
  const pie = [...extras, p.primary, p.secondary, p.tertiary, p.note].slice(
    0,
    12,
  );

  const variables: ThemeVariables = {
    darkMode: p.dark,
    background: p.background,
    fontFamily: classic ? CLASSIC_FONT : MODERN_FONT,
    fontSize: "15px",
    fontWeight: "500",
    textColor: p.text,
    lineColor: p.line,
    mainBkg: p.primary,
    nodeBkg: p.primary,
    nodeBorder: border,
    nodeTextColor: primaryText,
    clusterBkg: cluster,
    clusterBorder: mix(p.line, p.background, classic ? 0.28 : 0.45),
    titleColor: p.text,
    edgeLabelBackground: mix(p.background, p.muted, 0.18),
    tertiaryColor: p.tertiary,
    primaryColor: p.primary,
    primaryTextColor: primaryText,
    primaryBorderColor: border,
    secondaryColor: p.secondary,
    secondaryTextColor: secondaryText,
    secondaryBorderColor: mix(p.line, p.secondary, classic ? 0.22 : 0.38),
    tertiaryTextColor: tertiaryText,
    tertiaryBorderColor: mix(p.line, p.tertiary, classic ? 0.22 : 0.38),
    noteBkgColor: p.note,
    noteTextColor: onColor(p.note),
    noteBorderColor: mix(p.note, p.line, 0.35),
    actorBkg: p.primary,
    actorBorder: border,
    actorTextColor: primaryText,
    actorLineColor: p.line,
    signalColor: p.line,
    signalTextColor: p.text,
    labelBoxBkgColor: p.secondary,
    labelBoxBorderColor: mix(p.line, p.secondary, 0.3),
    labelTextColor: secondaryText,
    loopTextColor: p.text,
    activationBorderColor: p.line,
    activationBkgColor: mix(p.secondary, p.background, 0.28),
    sequenceNumberColor: onColor(p.line),
    sectionBkgColor: mix(p.background, p.primary, 0.22),
    altSectionBkgColor: mix(p.background, p.secondary, 0.2),
    sectionBkgColor2: mix(p.background, p.tertiary, 0.2),
    taskBorderColor: border,
    taskBkgColor: p.primary,
    activeTaskBorderColor: mix(p.line, p.secondary, 0.2),
    activeTaskBkgColor: p.secondary,
    gridColor: mix(p.line, p.background, 0.58),
    doneTaskBkgColor: p.tertiary,
    doneTaskBorderColor: mix(p.line, p.tertiary, 0.28),
    critBorderColor: mix(p.note, p.line, 0.25),
    critBkgColor: p.note,
    todayLineColor: p.line,
    personBorder: border,
    personBkg: p.primary,
    classText: primaryText,
    labelColor: p.text,
    errorBkgColor: p.note,
    errorTextColor: onColor(p.note),
    attributeBackgroundColorOdd: mix(p.background, p.muted, 0.1),
    attributeBackgroundColorEven: mix(p.background, p.primary, 0.16),
    arrowheadColor: p.line,
    defaultLinkColor: p.line,
    stateBkg: p.primary,
    stateBorder: border,
    stateLabelColor: p.text,
    transitionColor: p.line,
    transitionLabelColor: p.text,
    compositeBackground: cluster,
    compositeTitleBackground: mix(p.background, p.secondary, 0.22),
    compositeBorder: mix(p.line, p.background, 0.35),
    altBackground: mix(p.background, p.muted, 0.14),
    specialStateColor: p.line,
    innerEndBackground: p.background,
    labelBackgroundColor: mix(p.background, p.muted, 0.16),
    relationColor: p.line,
    relationLabelBackground: mix(p.background, p.muted, 0.16),
    relationLabelColor: p.text,
    requirementBackground: p.primary,
    requirementBorderColor: border,
    requirementTextColor: p.text,
    pieStrokeColor: p.background,
    pieOuterStrokeColor: p.background,
    pieTitleTextColor: p.text,
    pieSectionTextColor: p.text,
    pieLegendTextColor: p.text,
    pieOpacity: "1",
    useGradient: false,
    radius: classic ? 2 : 10,
    strokeWidth: classic ? 1.25 : 1.6,
  };

  pie.forEach((color, i) => {
    variables[`pie${i + 1}`] = color;
    variables[`cScale${i}`] = color;
    variables[`cScaleLabel${i}`] = onColor(color);
  });

  extras.forEach((color, i) => {
    variables[`git${i}`] = color;
    variables[`gitInv${i}`] = onColor(color);
    variables[`gitBranchLabel${i}`] = onColor(color);
    variables[`fillType${i}`] = mix(color, p.background, p.dark ? 0.22 : 0.12);
  });

  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    dark: p.dark,
    look: classic ? "classic" : "neo",
    curve: classic ? "linear" : "basis",
    background: p.background,
    swatch: [p.primary, p.line, p.background],
    variables,
  };
}

export const THEMES: DiagramTheme[] = [
  buildTheme({
    id: "obsidian",
    name: "Obsidian",
    kind: "modern",
    dark: true,
    background: "#09090b",
    primary: "#1f1f25",
    secondary: "#2b2b33",
    tertiary: "#3f3f48",
    text: "#f4f4f5",
    line: "#a1a1aa",
    muted: "#3f3f46",
    note: "#292524",
    extras: ["#6366f1", "#3b82c4", "#2a9d8f", "#c9a227", "#b5636a", "#7c8494"],
  }),
  buildTheme({
    id: "aurora",
    name: "Aurora",
    kind: "modern",
    dark: true,
    background: "#0a1214",
    primary: "#163038",
    secondary: "#1d3c46",
    tertiary: "#274850",
    text: "#e7f0f2",
    line: "#7aa3ab",
    muted: "#2c444c",
    note: "#1e3328",
    extras: ["#3d9a8c", "#5b8fa8", "#7d9a6e", "#c4a574", "#8b7ca8", "#6d9aa3"],
  }),
  buildTheme({
    id: "ember",
    name: "Ember",
    kind: "modern",
    dark: true,
    background: "#161310",
    primary: "#2a221c",
    secondary: "#362c24",
    tertiary: "#45382e",
    text: "#f4ede4",
    line: "#b9a08c",
    muted: "#4a3d34",
    note: "#3a2a20",
    extras: ["#c4785a", "#c4a574", "#8b6f5a", "#6b8f71", "#a67c52", "#b9a08c"],
  }),
  buildTheme({
    id: "mist",
    name: "Mist",
    kind: "modern",
    dark: false,
    background: "#f5f5f4",
    primary: "#ffffff",
    secondary: "#e7e5e4",
    tertiary: "#d6d3d1",
    text: "#1c1917",
    line: "#57534e",
    muted: "#a8a29e",
    note: "#f6edd8",
    extras: ["#44403c", "#0f766e", "#1e3a5f", "#a16207", "#9f1239", "#57534e"],
  }),
  buildTheme({
    id: "carbon",
    name: "Carbon",
    kind: "modern",
    dark: true,
    background: "#161616",
    primary: "#262626",
    secondary: "#393939",
    tertiary: "#525252",
    text: "#f4f4f4",
    line: "#8d8d8d",
    muted: "#6f6f6f",
    note: "#3d3020",
    extras: ["#78a9ff", "#42be65", "#f1c21b", "#ff8389", "#be95ff", "#08bdba"],
  }),
  buildTheme({
    id: "boardroom",
    name: "Boardroom",
    kind: "classic",
    dark: false,
    background: "#ffffff",
    primary: "#f7f8fa",
    secondary: "#eef1f6",
    tertiary: "#e2e8f0",
    text: "#0f2744",
    line: "#1b365d",
    muted: "#8a96a8",
    note: "#f7efd4",
    extras: ["#1b365d", "#4a6fa5", "#b8952c", "#5c6b7a", "#6b2d3c", "#2d5a4a"],
  }),
  buildTheme({
    id: "memo",
    name: "Memo",
    kind: "classic",
    dark: false,
    background: "#f6f3eb",
    primary: "#fffcf7",
    secondary: "#efe8d8",
    tertiary: "#e4d9c4",
    text: "#2c261c",
    line: "#4a4033",
    muted: "#9a8f7c",
    note: "#efe0b8",
    extras: ["#4a4033", "#6b5344", "#2f4a3c", "#1b365d", "#8b5a2b", "#7a7164"],
  }),
  buildTheme({
    id: "navy",
    name: "Navy",
    kind: "classic",
    dark: true,
    background: "#102033",
    primary: "#183049",
    secondary: "#1e3d5c",
    tertiary: "#274a6b",
    text: "#f2f6fa",
    line: "#a8bdd0",
    muted: "#3d5570",
    note: "#3d3420",
    extras: ["#c9a84c", "#8eabc4", "#dce6f0", "#6b8cae", "#a67c52", "#7a9e8e"],
  }),
  buildTheme({
    id: "ledger",
    name: "Ledger",
    kind: "classic",
    dark: false,
    background: "#fafaf7",
    primary: "#ffffff",
    secondary: "#eef2ee",
    tertiary: "#e0e6e1",
    text: "#1a2e24",
    line: "#2c4a3e",
    muted: "#8a968e",
    note: "#f0e6c8",
    extras: ["#2c4a3e", "#1b365d", "#8b6914", "#5c4033", "#4a6670", "#6b7c70"],
  }),
  buildTheme({
    id: "ink",
    name: "Ink",
    kind: "classic",
    dark: false,
    background: "#ffffff",
    primary: "#ffffff",
    secondary: "#f4f4f4",
    tertiary: "#e8e8e8",
    text: "#111111",
    line: "#222222",
    muted: "#888888",
    note: "#f5f5f5",
    extras: ["#111111", "#444444", "#666666", "#888888", "#333333", "#555555"],
  }),
];

export const DEFAULT_THEME_ID = "obsidian";

export function getTheme(id: string): DiagramTheme {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}
