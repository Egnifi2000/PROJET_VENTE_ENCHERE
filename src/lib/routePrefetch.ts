const routeLoaders: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/Index"),
  "/auth": () => import("@/pages/Auth"),
  "/my-bids": () => import("@/pages/MyBids"),
  "/admin": () => import("@/pages/admin/AdminDashboard"),
  "/admin/users": () => import("@/pages/admin/AdminUsers"),
  "/admin/articles": () => import("@/pages/admin/AdminArticles"),
  "/admin/auctions": () => import("@/pages/admin/AdminAuctions"),
};

const prefetchedRoutes = new Set<string>();

export function prefetchRoute(path: string) {
  const normalizedPath = path.split("?")[0];
  const loader = routeLoaders[normalizedPath];

  if (!loader || prefetchedRoutes.has(normalizedPath)) {
    return;
  }

  prefetchedRoutes.add(normalizedPath);
  void loader();
}

export function prefetchRoutes(paths: string[]) {
  paths.forEach(prefetchRoute);
}

export function schedulePrefetch(paths: string[]) {
  const schedule = () => prefetchRoutes(paths);

  if (typeof window === "undefined") {
    schedule();
    return;
  }

  if ("requestIdleCallback" in window) {
    const requestIdleCallback = window.requestIdleCallback as (callback: () => void) => number;
    requestIdleCallback(schedule);
    return;
  }

  window.setTimeout(schedule, 250);
}
