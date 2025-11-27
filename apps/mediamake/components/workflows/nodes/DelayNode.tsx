import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { WorkflowNode, DelayNodeData } from '@/lib/workflows/types';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export const DelayNode = memo(({ data, selected }: NodeProps<WorkflowNode>) => {
  const delayData = data as DelayNodeData;

  const formatDuration = () => {
    if (!delayData.duration) return '0ms';
    const value = delayData.duration;
    const unit = delayData.unit || 'ms';
    return `${value}${unit}`;
  };

  return (
    <Card
      className={cn(
        'w-[240px] bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800',
        selected && 'ring-2 ring-primary',
      )}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="w-3 h-3 !bg-slate-500"
      />

      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-500" />
          <h3 className="font-semibold text-sm">Delay</h3>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-0">
        <div className="text-center">
          <p className="text-2xl font-bold">{formatDuration()}</p>
          <p className="text-xs text-muted-foreground mt-1">Wait time</p>
        </div>
      </CardContent>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="w-3 h-3 !bg-slate-500"
      />
    </Card>
  );
});

DelayNode.displayName = 'DelayNode';

