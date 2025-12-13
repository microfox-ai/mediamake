'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, ArrowLeft, Download } from 'lucide-react';
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
          <Button 
            variant="outline"
            onClick={() => {
              const json = JSON.stringify(workflow, null, 2);
              const blob = new Blob([json], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${workflow.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_workflow.json`;
              a.click();
              URL.revokeObjectURL(url);
              console.log('✅ Workflow exported!');
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

