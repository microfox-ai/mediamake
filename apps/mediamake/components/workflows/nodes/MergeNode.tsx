import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { WorkflowNode, MergeNodeData } from '@/lib/workflows/types';
import { Merge } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MergeNode = memo(({ data, selected }: NodeProps<WorkflowNode>) => {
  const mergeData = data as MergeNodeData;

  return (
    <Card
      className={cn(
        'w-[280px] bg-cyan-50 dark:bg-cyan-950 border-cyan-200 dark:border-cyan-800',
        selected && 'ring-2 ring-primary',
      )}
    >
      {/* Input Handles - Multiple */}
      <Handle
        type="target"
        position={Position.Left}
        id="input1"
        style={{ top: '33%' }}
        className="w-3 h-3 !bg-cyan-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="input2"
        style={{ top: '50%' }}
        className="w-3 h-3 !bg-cyan-500"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="input3"
        style={{ top: '67%' }}
        className="w-3 h-3 !bg-cyan-500"
      />

      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <Merge className="h-4 w-4 text-cyan-500" />
          <h3 className="font-semibold text-sm">Merge</h3>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Strategy:</span>
            <Badge variant="secondary" className="text-xs">
              {mergeData.strategy || 'merge'}
            </Badge>
          </div>
        </div>
      </CardContent>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 !bg-cyan-500"
      />
    </Card>
  );
});

MergeNode.displayName = 'MergeNode';

