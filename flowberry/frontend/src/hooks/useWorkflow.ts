import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";
import type { WorkflowStep, WorkflowSummary, WorkflowLog } from "../types";

export function useWorkflow(workflowId: string) {
  return useQuery({
    queryKey: ["workflow", workflowId],
    queryFn: async () => {
      const { data } = await api.get<{ data: WorkflowSummary }>(`/workflows/${workflowId}`);
      return data.data;
    },
    refetchInterval: 4000,
    enabled: !!workflowId,
  });
}

export function useWorkflowSteps(workflowId: string) {
  return useQuery({
    queryKey: ["workflow-steps", workflowId],
    queryFn: async () => {
      const { data } = await api.get<{ data: WorkflowStep[] }>(`/workflows/${workflowId}/steps`);
      return data.data;
    },
    refetchInterval: 4000,
    enabled: !!workflowId,
  });
}

export function useWorkflowLogs(workflowId: string) {
  return useQuery({
    queryKey: ["workflow-logs", workflowId],
    queryFn: async () => {
      const { data } = await api.get<{ data: WorkflowLog[] }>(`/workflows/${workflowId}/logs`);
      return data.data;
    },
    refetchInterval: 3000,
    enabled: !!workflowId,
  });
}
