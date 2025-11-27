import type { WorkflowDefinition, WorkflowExecution } from '@/lib/workflows/types';

// MongoDB document for workflows collection
export interface WorkflowDocument extends Omit<WorkflowDefinition, 'createdAt' | 'updatedAt'> {
  _id?: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  version: number;
  executions?: string[]; // References to execution IDs
}

// MongoDB document for workflow executions collection
export interface WorkflowExecutionDocument extends Omit<WorkflowExecution, 'id'> {
  _id?: string;
  createdAt: Date;
}

// Query parameters for listing workflows
export interface ListWorkflowsParams {
  userId?: string;
  tags?: string[];
  isPublic?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// API response types
export interface WorkflowResponse {
  success: boolean;
  data?: WorkflowDocument;
  error?: string;
}

export interface WorkflowListResponse {
  success: boolean;
  data?: {
    workflows: WorkflowDocument[];
    total: number;
    limit: number;
    offset: number;
  };
  error?: string;
}

export interface ExecutionResponse {
  success: boolean;
  data?: WorkflowExecutionDocument;
  error?: string;
}

