import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WorkflowNode, LoopNodeData } from '@/lib/workflows/types';
import { Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';

export const LoopNode = memo(({ data, selected }: NodeProps<WorkflowNode>) => {
  const loopData = data as LoopNodeData;

  return (
    <Card
      className={cn(
        'w-[280px] bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800',
        selected && 'ring-2 ring-primary',
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="array"
        className="w-3 h-3 !bg-orange-500"
      />

      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <Repeat className="h-4 w-4 text-orange-500" />
          <h3 className="font-semibold text-sm">Loop</h3>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Iterate over:</span>
            <Badge variant="secondary" className="text-xs">
              {loopData.iterateOver || 'array'}
            </Badge>
          </div>
          {loopData.maxIterations && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Max:</span>
              <span>{loopData.maxIterations}</span>
            </div>
          )}
        </div>
      </CardContent>

      {/* Output Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="item"
        style={{ top: '40%' }}
        className="w-3 h-3 !bg-orange-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="result"
        style={{ top: '60%' }}
        className="w-3 h-3 !bg-green-500"
      />
    </Card>
  );
});

LoopNode.displayName = 'LoopNode';

