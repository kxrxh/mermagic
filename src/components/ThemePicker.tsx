import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Popover } from "@/components/Popover";
import {
  canvasPatternStyle,
  type DiagramTheme,
  getTheme,
  THEMES,
} from "@/lib/themes";

type Filter = "all" | "dark" | "light";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All themes" },
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
];

export function ThemePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const selected = getTheme(value);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const filtered = THEMES.filter(
    (theme) =>
      (filter === "all" || theme.dark === (filter === "dark")) &&
      `${theme.name} ${theme.description} ${theme.kind} ${theme.pattern}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <Popover
      className="theme-picker"
      buttonClassName="button theme-trigger"
      label={
        <>
          <span
            className="active-theme-dot"
            style={{ background: selected.swatch[1] }}
          />
          <span>{selected.name}</span>
          <Icon name="down" />
        </>
      }
    >
      <div className="theme-picker-heading">
        <span className="theme-heading-icon">
          <Icon name="palette" />
        </span>
        <div>
          <strong>Set the mood.</strong>
          <span>A canvas that feels like your idea.</span>
        </div>
        <span className="theme-count">{THEMES.length} themes</span>
      </div>
      <label className="theme-search">
        <Icon name="search" />
        <input
          aria-label="Search canvas themes"
          placeholder="Find your palette…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <fieldset className="theme-filters" aria-label="Theme brightness">
        {FILTERS.map((item) => (
          <button
            type="button"
            key={item.id}
            aria-pressed={item.id === filter}
            className={item.id === filter ? "active" : ""}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
            <span>
              {
                THEMES.filter(
                  (theme) =>
                    item.id === "all" || theme.dark === (item.id === "dark"),
                ).length
              }
            </span>
          </button>
        ))}
      </fieldset>
      <div className="theme-gallery">
        {[
          { label: "THE NEW COLLECTION", featured: true },
          { label: "THE ESSENTIALS", featured: false },
        ].map((group) => {
          const themes = filtered.filter(
            (theme) => theme.featured === group.featured,
          );
          return themes.length ? (
            <section key={group.label} className="theme-collection">
              <div className="section-label">
                {group.label}
                {group.featured ? (
                  <span className="new-collection-badge">NEW</span>
                ) : null}
              </div>
              <div className="theme-card-grid">
                {themes.map((theme) => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    selected={theme.id === value}
                    onSelect={() => onChange(theme.id)}
                  />
                ))}
              </div>
            </section>
          ) : null;
        })}
        {!filtered.length ? (
          <div className="theme-no-results">
            <Icon name="search" />
            <strong>No palette found.</strong>
            <span>Try a different color, mood, or pattern.</span>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Show all themes
            </button>
          </div>
        ) : null}
      </div>
      <div className="theme-picker-footer">
        <span className="status-dot" />
        Applied to your canvas and exports.<span>ESC to close</span>
      </div>
    </Popover>
  );
}

function ThemeCard({
  theme,
  selected,
  onSelect,
}: {
  theme: DiagramTheme;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`theme-card ${selected ? "selected" : ""}`}
      aria-label={theme.name}
      aria-pressed={selected}
      title={theme.description}
      onClick={onSelect}
    >
      <span
        className="theme-card-preview"
        style={{
          backgroundColor: theme.background,
          ...canvasPatternStyle(theme),
        }}
      >
        <svg viewBox="0 0 120 58" fill="none" aria-hidden="true">
          <path
            d="M31 29h15m27 0h16"
            stroke={theme.swatch[1]}
            strokeWidth="1.3"
          />
          <path
            d="m42 26 4 3-4 3m43-6 4 3-4 3"
            stroke={theme.swatch[1]}
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect
            x="7"
            y="19"
            width="24"
            height="20"
            rx={theme.look === "classic" ? 1 : 4}
            fill={theme.swatch[0]}
            stroke={theme.swatch[1]}
            strokeWidth=".8"
          />
          <path
            d="m60 15 13 14-13 14-14-14z"
            fill={String(theme.variables.secondaryColor)}
            stroke={theme.swatch[1]}
            strokeWidth=".8"
          />
          <rect
            x="89"
            y="19"
            width="24"
            height="20"
            rx={theme.look === "classic" ? 1 : 10}
            fill={String(theme.variables.tertiaryColor)}
            stroke={theme.swatch[1]}
            strokeWidth=".8"
          />
          <path
            d="M15 27h8m-8 4h5m80-4h8m-8 4h5"
            stroke={String(theme.variables.primaryTextColor)}
            strokeOpacity=".6"
            strokeWidth="1"
            strokeLinecap="round"
          />
        </svg>
        {selected ? (
          <span className="theme-card-check">
            <Icon name="check" />
          </span>
        ) : null}
      </span>
      <span className="theme-card-name">
        {theme.name}
        <span className="theme-card-colors">
          {(["primary", "secondary", "line"] as const).map((slot) => (
            <span
              key={slot}
              style={{
                background:
                  slot === "primary"
                    ? theme.swatch[0]
                    : slot === "secondary"
                      ? String(theme.variables.secondaryColor)
                      : theme.swatch[1],
              }}
            />
          ))}
        </span>
      </span>
    </button>
  );
}
