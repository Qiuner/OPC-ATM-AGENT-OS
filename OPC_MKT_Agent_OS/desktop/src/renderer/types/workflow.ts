export type ContentType = 'video' | 'article' | 'podcast' | 'social' | 'team';
export type WorkflowStatus = 'queued' | 'running' | 'paused_for_intervention' | 'completed' | 'failed';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'waiting_intervention';

export interface WorkflowStepRecord {
  id: string;
  label: string;
  status: StepStatus;
  started_at: string | null;
  completed_at: string | null;
  result_summary: string | null;
  error: string | null;
}

export interface WorkflowRun {
  id: string;
  status: WorkflowStatus;
  content_type: ContentType;
  command: string;
  original_message: string;
  source: 'manual' | 'feishu';
  feishu_chat_id: string | null;
  feishu_intervention_message_id: string | null;
  steps: WorkflowStepRecord[];
  current_step_index: number;
  created_at: string;
  updated_at: string;
  generated_content: string | null;
  creatorflow_script_id: string | null;
  result_data: Record<string, unknown> | null;
}
