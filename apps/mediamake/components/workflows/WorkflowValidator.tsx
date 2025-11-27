'use client';

import { useEffect, useState } from 'react';
import type { WorkflowDefinition, WorkflowValidationResult } from '@/lib/workflows/types';
import { validateWorkflow } from '@/lib/workflows/validator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface WorkflowValidatorProps {
  workflow: WorkflowDefinition;
  onValidationChange?: (result: WorkflowValidationResult) => void;
}

export function WorkflowValidator({
  workflow,
  onValidationChange,
}: WorkflowValidatorProps) {
  const [validation, setValidation] = useState<WorkflowValidationResult>({
    valid: true,
    errors: [],
  });

  useEffect(() => {
    const result = validateWorkflow(workflow);
    setValidation(result);
    onValidationChange?.(result);
  }, [workflow.nodes, workflow.edges, onValidationChange]);

  const errors = validation.errors.filter(e => e.type === 'error');
  const warnings = validation.errors.filter(e => e.type === 'warning');

  if (validation.valid && warnings.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 space-y-2 z-50">
      {/* Errors */}
      {errors.map((error, index) => (
        <Alert key={`error-${index}`} variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm">{error.message}</span>
              {error.nodeId && (
                <Badge variant="outline" className="text-xs">
                  Node
                </Badge>
              )}
              {error.edgeId && (
                <Badge variant="outline" className="text-xs">
                  Edge
                </Badge>
              )}
            </div>
          </AlertDescription>
        </Alert>
      ))}

      {/* Warnings */}
      {warnings.slice(0, 3).map((warning, index) => (
        <Alert key={`warning-${index}`}>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <span className="text-sm">{warning.message}</span>
          </AlertDescription>
        </Alert>
      ))}

      {warnings.length > 3 && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="ml-2">
            <span className="text-sm">
              +{warnings.length - 3} more warnings
            </span>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

