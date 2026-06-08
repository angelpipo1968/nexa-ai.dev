export interface AgentJob {
  id: string;
  agent_id: string;
  type: 'chat' | 'tool' | 'batch';
  priority: number;
  input_tokens: number;
  max_tokens: number;
  model: string;
  messages: any[];
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'killed';
  result?: any;
  error?: string;
  created_at: number;
}
