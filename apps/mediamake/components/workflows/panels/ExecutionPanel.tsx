'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, ArrowLeft } from 'lucide-react';
import type { WorkflowDefinition, ExecutionStatus } from '@/lib/workflows/types';
import { WorkflowExecutor } from '../WorkflowExecutor';

interface ExecutionPanelProps {
  workflowName: string;
  onWorkflowNameChange: (name: string) => void;
  onSave: () => void;
  isSaving: boolean;
  onBack: () => void;
  workflow: WorkflowDefinition;
  onNodeUpdate?: (nodeId: string, status: ExecutionStatus, result?: any, error?: any) => void;
}

export function ExecutionPanel({
  workflowName,
  onWorkflowNameChange,
  onSave,
  isSaving,
  onBack,
  workflow,
  onNodeUpdate,
}: ExecutionPanelProps) {
  return (
    <div className="border-b bg-background p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Input
            value={workflowName}
            onChange={e => onWorkflowNameChange(e.target.value)}
            className="max-w-md"
            placeholder="Workflow name"
          />
        </div>
        <div className="flex items-center gap-2">
          <WorkflowExecutor
            workflow={workflow}
            onNodeUpdate={onNodeUpdate}
            onExecutionComplete={results => {
              console.log('Execution complete:', results);
            }}
          />
          <Button onClick={onSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

