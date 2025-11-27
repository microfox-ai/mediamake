import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { WorkflowNode, TransformNodeData } from '@/lib/workflows/types';
import { Shuffle, Loader2, CheckCircle, XCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConnectionContext } from '../WorkflowEditor';
import { Button } from '@/components/ui/button';

export const TransformNode = memo(({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const transformData = data as TransformNodeData & { status?: string };

  // Get connection state and run function from context
  const { isConnecting, onRunNode } = useConnectionContext();
  
  const handleRunNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRunNode) {
      onRunNode(id);
    }
  };

  const statusIcon = {
    running: <Loader2 className="h-3 w-3 animate-spin text-blue-500" />,
    success: <CheckCircle className="h-3 w-3 text-green-500" />,
    error: <XCircle className="h-3 w-3 text-red-500" />,
  }[transformData.status || ''];

  return (
    <>
      <div
        className={cn(
          'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900',
          'border-2 rounded-lg shadow-sm overflow-hidden',
          'w-[200px] h-[120px]',
          selected ? 'border-amber-500 ring-2 ring-amber-500 ring-offset-2' : 'border-amber-300 dark:border-amber-700',
          transformData.status === 'running' && 'border-blue-500 animate-pulse',
          transformData.status === 'success' && 'border-green-500',
          transformData.status === 'error' && 'border-red-500',
        )}
      >
        {/* Header - Always at the top */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-amber-200/50 dark:border-amber-800/50">
          <div className="flex items-center gap-2">
            <Shuffle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <h3 className="font-semibold text-sm text-amber-900 dark:text-amber-100">Transform</h3>
          </div>
          <div className="flex items-center gap-1">
            {/* Run button */}
            {transformData.status !== 'running' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 nodrag hover:bg-amber-200 dark:hover:bg-amber-800"
                onClick={handleRunNode}
                title="Run this node"
              >
                <Play className="h-3 w-3 text-amber-700 dark:text-amber-300" />
              </Button>
            )}
            {statusIcon}
          </div>
        </div>

        {/* Content - Hide when connecting to avoid overlap with labels */}
        {!isConnecting && (
          <div className="p-3">
            <div className="text-xs text-muted-foreground text-center py-2">
              {transformData.operation || 'Custom'}
            </div>
          </div>
        )}
      </div>

      {/* Input Handle */}
      <div>
        <Handle
          type="target"
          position={Position.Left}
          id="input"
          style={{ top: '60px' }} // Center in content area (40px header + 40px offset)
          className="w-3 h-3 !bg-amber-500 !border-2 !border-white dark:!border-gray-800 hover:!scale-150 transition-transform"
          title="Input"
        />
        {/* Label - appears inside the node next to handle when connecting */}
        {isConnecting && (
          <div
            style={{
              position: 'absolute',
              left: '12px',
              top: '60px',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              zIndex: 1000,
            }}
            className="text-xs font-medium text-amber-900 dark:text-amber-100 bg-amber-100/90 dark:bg-amber-900/90 px-2 py-0.5 rounded shadow-sm whitespace-nowrap border border-amber-300 dark:border-amber-700"
          >
            Input
          </div>
        )}
      </div>

      {/* Output Handle */}
      <div>
        <Handle
          type="source"
          position={Position.Right}
          id="output"
          style={{ top: '60px' }} // Center in content area (40px header + 40px offset)
          className="w-3 h-3 !bg-amber-500 !border-2 !border-white dark:!border-gray-800 hover:!scale-150 transition-transform"
          title="Output"
        />
        {/* Label - appears inside the node next to handle when connecting */}
        {isConnecting && (
          <div
            style={{
              position: 'absolute',
              right: '12px',
              top: '60px',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              zIndex: 1000,
            }}
            className="text-xs font-medium text-amber-900 dark:text-amber-100 bg-amber-100/90 dark:bg-amber-900/90 px-2 py-0.5 rounded shadow-sm whitespace-nowrap border border-amber-300 dark:border-amber-700"
          >
            Output
          </div>
        )}
      </div>
    </>
  );
});

TransformNode.displayName = 'TransformNode';

