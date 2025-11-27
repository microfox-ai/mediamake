'use client';

import { useState } from 'react';
import type {
  WorkflowDefinition,
  ExecutionState,
  ExecutionProgressCallback,
  ExecutionStatus,
} from '@/lib/workflows/types';
import { executeWorkflow } from '@/lib/workflows/executor';
import { Button } from '@/components/ui/button';
import { Play, StopCircle, RotateCcw, PlayCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface WorkflowExecutorProps {
  workflow: WorkflowDefinition;
  onExecutionComplete?: (results: Map<string, any>) => void;
  onNodeUpdate?: (nodeId: string, status: ExecutionStatus, result?: any, error?: any) => void;
}

export function WorkflowExecutor({
  workflow,
  onExecutionComplete,
  onNodeUpdate,
}: WorkflowExecutorProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [showExecutionDialog, setShowExecutionDialog] = useState(false);

  // Check if any nodes have already been executed
  const hasExecutedNodes = workflow.nodes.some(node => 
    node.data.status === 'success' || node.data.status === 'error'
  );

  const handleExecuteClick = () => {
    if (hasExecutedNodes) {
      // Show dialog if there are already executed nodes
      setShowExecutionDialog(true);
    } else {
      // Execute normally if no nodes have run yet
      executeWorkflow(false);
    }
  };

  const executeWorkflow = async (rerunAll: boolean) => {
    try {
      setIsExecuting(true);
      setExecutionError(null);
      setShowExecutionDialog(false);

      // If rerunAll, clear all node statuses
      if (rerunAll) {
        workflow.nodes.forEach(node => {
          onNodeUpdate?.(node.id, 'idle');
        });
      }

      // Progress callback
      const onProgress: ExecutionProgressCallback = ({ nodeId, status, result, error }) => {
        onNodeUpdate?.(nodeId, status, result, error);
      };

      // Execute workflow
      const { executeWorkflow: runWorkflow } = await import('@/lib/workflows/executor');
      const results = await runWorkflow(workflow, onProgress, !rerunAll);

      // Notify completion
      onExecutionComplete?.(results);
    } catch (error) {
      console.error('Execution error:', error);
      setExecutionError(error instanceof Error ? error.message : 'Execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          onClick={handleExecuteClick}
          disabled={isExecuting || workflow.nodes.length === 0}
          variant={isExecuting ? 'outline' : 'default'}
        >
          {isExecuting ? (
            <>
              <StopCircle className="mr-2 h-4 w-4 animate-pulse" />
              Executing...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Execute
            </>
          )}
        </Button>
        {executionError && (
          <span className="text-sm text-red-500">{executionError}</span>
        )}
      </div>

      {/* Execution Options Dialog */}
      <AlertDialog open={showExecutionDialog} onOpenChange={setShowExecutionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Continue or Rerun?</AlertDialogTitle>
            <AlertDialogDescription>
              Some nodes have already been executed. Would you like to:
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 my-4">
            <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer" onClick={() => executeWorkflow(false)}>
              <PlayCircle className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <div className="font-medium text-sm">Continue from last run</div>
                <div className="text-xs text-muted-foreground">Skip already executed nodes and use their cached results</div>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer" onClick={() => executeWorkflow(true)}>
              <RotateCcw className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-medium text-sm">Rerun all nodes</div>
                <div className="text-xs text-muted-foreground">Clear previous results and execute entire workflow</div>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

