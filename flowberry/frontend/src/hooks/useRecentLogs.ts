import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { RecentWorkflowLog } from "../types";

export function useRecentLogs(opts: { workflowId?: string; limit?: number } = {}) {
  const workflowId = opts.workflowId ?? "";
  const limit = opts.limit ?? 120;

  return useQuery({
    queryKey: ["recent-logs", workflowId, limit],
    queryFn: async () => {
      const { data } = await api.get<{ data: RecentWorkflowLog[] }>("/logs/recent", {
        params: { workflow_id: workflowId || undefined, limit },
      });
      return data.data;
    },
    refetchInterval: 2000,
  });
}

