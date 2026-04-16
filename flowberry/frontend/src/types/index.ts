export type Role = "admin" | "user";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface WorkflowSummary {
  id: string;
  status: string;
  intent_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkflowStep {
  id: string;
  step_order: number;
  step_name: string;
  step_type: string;
  status: string;
  depends_on_step_id?: string | null;
  output_payload?: string | null;
}

export interface WorkflowLog {
  id: string;
  level: string;
  message: string;
  trace_id?: string;
  created_at: string;
}
