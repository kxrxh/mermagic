import { THEMES, type ThemeKind } from "@/lib/themes";

type ThemePickerProps = {
  value: string;
  onChange: (id: string) => void;
};

const GROUPS: { id: ThemeKind; label: string }[] = [
  { id: "modern", label: "Modern" },
  { id: "classic", label: "Classic" },
];

export function ThemePicker({ value, onChange }: ThemePickerProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {GROUPS.map((group) => (
        <div key={group.id} className="flex min-w-0 items-center gap-2">
          <span className="w-12 shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            {group.label}
          </span>
          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto scrollbar-thin">
            {THEMES.filter((theme) => theme.kind === group.id).map((theme) => {
              const selected = theme.id === value;
              return (
                <button
                  key={theme.id}
                  type="button"
                  title={theme.name}
                  onClick={() => onChange(theme.id)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition ${
                    selected
                      ? "border-cyan-400/50 bg-cyan-400/10 text-cyan-100"
                      : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10"
                  }`}
                >
                  <span className="flex h-3 w-3 overflow-hidden rounded-[3px] ring-1 ring-white/20">
                    {(["fill", "line", "bg"] as const).map((slot, index) => (
                      <span
                        key={`${theme.id}-${slot}`}
                        className="h-full flex-1"
                        style={{ background: theme.swatch[index] }}
                      />
                    ))}
                  </span>
                  {theme.name}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
