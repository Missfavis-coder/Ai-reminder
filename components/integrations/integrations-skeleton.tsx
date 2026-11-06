
export function WorkspaceSkeleton() {
    return (
      <div
        className="mt-4 space-y-4 "
        aria-label="Loading workspaces"
        aria-busy="true"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-lg bg-neutral-100 p-3"
          >
            <div className="size-9 animate-pulse rounded-lg bg-muted" />
  
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
              <div className="h-2.5 w-1/4 animate-pulse rounded bg-muted" />
            </div>
  
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    );
  }
 
  export function WorkspaceOverviewSkeleton() {
    return (
      <div
        className="mt-4 grid grid-cols-1 lg:grid-cols-4 gap-4 "
        aria-label="Loading workspaces"
        aria-busy="true"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-lg bg-neutral-100 p-3"
          >
            <div className="size-9 animate-pulse rounded-lg bg-muted" />
  
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
              <div className="h-2.5 w-1/4 animate-pulse rounded bg-muted" />
            </div>
  
            <div className="h-6 w-20 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    );
  }
  export function NotificationChannelsSkeleton() {
    return (
      <div
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        aria-label="Loading notification channels"
        aria-busy="true"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border border-border p-4 sm:p-5"
          >
            <div className="flex items-start justify-between">
              <div className="size-11 animate-pulse rounded-xl bg-muted" />
              <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
            </div>
  
            <div className="mt-4 space-y-2">
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            </div>
  
            <div className="mt-6 flex justify-between border-t border-border pt-4">
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-8 w-20 animate-pulse rounded-md bg-muted" />
            </div>
          </div>
        ))}
      </div>
    );
  }
  