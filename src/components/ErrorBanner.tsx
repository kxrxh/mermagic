type ErrorBannerProps = {
  message: string;
};

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="border-t border-rose-500/30 bg-rose-950/80 px-3 py-2 font-mono text-[11px] leading-relaxed text-rose-100"
    >
      <span className="font-medium text-rose-300">Parse error</span>
      <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap text-rose-100/90">
        {message}
      </pre>
    </div>
  );
}
