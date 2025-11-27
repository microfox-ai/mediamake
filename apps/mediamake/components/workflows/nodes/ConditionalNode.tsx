import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { WorkflowNode, ConditionalNodeData } from '@/lib/workflows/types';
import { GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ConditionalNode = memo(({ data, selected }: NodeProps<WorkflowNode>) => {
  const conditionalData = data as ConditionalNodeData;

  return (
    <Card
      className={cn(
        'w-[280px] bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
        selected && 'ring-2 ring-primary',
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 !bg-yellow-500"
      />

      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-yellow-500" />
          <h3 className="font-semibold text-sm">Conditional</h3>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0">
        <div className="space-y-2">
          {conditionalData.condition && (
            <div className="text-xs font-mono bg-background p-2 rounded border">
              {conditionalData.condition.length > 40
                ? conditionalData.condition.slice(0, 40) + '...'
                : conditionalData.condition}
            </div>
          )}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{conditionalData.trueLabel || 'True'}</span>
            <span>{conditionalData.falseLabel || 'False'}</span>
          </div>
        </div>
      </CardContent>

      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '40%' }}
        className="w-3 h-3 !bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '60%' }}
        className="w-3 h-3 !bg-red-500"
      />
    </Card>
  );
});

ConditionalNode.displayName = 'ConditionalNode';

