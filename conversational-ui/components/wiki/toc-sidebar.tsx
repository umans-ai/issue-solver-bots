'use client';

type TocItem = {
  id: string;
  text: string;
  level: number;
};

type TocSidebarProps = {
  items: TocItem[];
  onNavigate: (id: string) => void;
  isLoading?: boolean;
};

export function TocSidebar({ items, onNavigate, isLoading }: TocSidebarProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-3 w-24 bg-muted rounded animate-pulse" />
        <div className="h-3 w-20 bg-muted rounded animate-pulse" />
        <div className="h-3 w-28 bg-muted rounded animate-pulse" />
        <div className="h-3 w-16 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md bg-muted/40 px-3 py-4 text-xs text-muted-foreground">
        No headings yet.
      </div>
    );
  }

  return (
    <div className="mt-3 max-h-[calc(100vh-10rem)] overflow-y-auto pr-1 space-y-[2px] pt-1">
      {items.map((item) => {
        const indent =
          item.level >= 3
            ? 'pl-5'
            : item.level === 2
              ? 'pl-3'
              : '';
        return (
          <div key={item.id} className={indent}>
            <button
              type="button"
              onClick={() => onNavigate(item.id)}
              className="group relative flex w-full items-start rounded-md px-2 py-[5px] text-left text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
            >
              <span className="block text-[12px] leading-5 whitespace-normal break-words">
                {item.text}
              </span>
              <span className="pointer-events-none absolute left-full top-1/2 z-10 hidden min-w-[260px] -translate-y-1/2 translate-x-3 rounded-md border border-border/70 bg-background/95 px-2 py-1 text-[11px] text-foreground shadow-sm group-hover:flex dark:bg-background/90">
                {item.text}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
