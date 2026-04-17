import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { RecentWorkflow } from "../types";

export function useRecentWorkflows(opts: { limit?: number } = {}) {
  const limit = opts.limit ?? 60;

  return useQuery({
    queryKey: ["recent-workflows", limit],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecentWorkflow[] }>("/workflows/recent", {
        params: { limit },
      });
      return data.data;
    },
    refetchInterval: 4000,
  });
}

