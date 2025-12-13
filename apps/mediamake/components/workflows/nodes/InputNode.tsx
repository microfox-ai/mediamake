import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { WorkflowNode, InputNodeData } from '@/lib/workflows/types';
import { ArrowRightCircle, CheckCircle, Loader2, XCircle, Play, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConnectionContext } from '../WorkflowEditor';
import { Button } from '@/components/ui/button';
import { ResultPreview } from '../ResultPreview';

export const InputNode = memo(({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const inputData = data as InputNodeData & { status?: string; result?: any };
  const fields = inputData.fields || [];

  // Get connection state and run function from context
  const { isConnecting, onRunNode } = useConnectionContext();
  
  const handleRunNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRunNode) {
      onRunNode(id);
    }
  };

  // Calculate dynamic height based on number of fields and result
  const headerHeight = 40;
  const minContentHeight = inputData.result ? 0 : 80;
  const handleSpacing = 32; // Space per handle
  const baseHeight = headerHeight + Math.max(minContentHeight, fields.length * handleSpacing);
  const useAutoHeight = !!inputData.result;

  const statusIcon = {
    running: <Loader2 className="h-3 w-3 animate-spin text-blue-500" />,
    success: <CheckCircle className="h-3 w-3 text-green-500" />,
    error: <XCircle className="h-3 w-3 text-red-500" />,
  }[inputData.status || ''];

  return (
    <>
      <div
        style={useAutoHeight ? { minHeight: `${baseHeight}px`, position: 'relative' } : { height: `${baseHeight}px`, position: 'relative' }}
        className={cn(
          'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900',
          'border-2 rounded-lg shadow-sm overflow-hidden',
          'w-[280px]', // Wider for better content display
          selected ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-2' : 'border-blue-300 dark:border-blue-700',
          inputData.status === 'running' && 'border-blue-500 animate-pulse',
          inputData.status === 'success' && 'border-green-500',
          inputData.status === 'error' && 'border-red-500',
        )}
      >
        {/* Header - Always at the top */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-blue-200/50 dark:border-blue-800/50">
          <div className="flex items-center gap-2">
            <ArrowRightCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100">Input</h3>
          </div>
          <div className="flex items-center gap-1">
            {/* Run button */}
            {inputData.status !== 'running' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 nodrag hover:bg-blue-200 dark:hover:bg-blue-800"
                onClick={handleRunNode}
                title="Run this node"
              >
                <Play className="h-3 w-3 text-blue-700 dark:text-blue-300" />
              </Button>
            )}
            {statusIcon}
          </div>
        </div>

        {/* Content - Hide when connecting to avoid overlap with labels */}
        {!isConnecting && (
          <div className="p-3 space-y-2">
            {fields.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No fields configured
              </p>
            ) : inputData.result ? (
              <>
                <div className="flex items-center gap-2 justify-between">
                  <div className="text-xs font-medium flex items-center gap-1 text-green-600 dark:text-green-400">
                    <Eye className="h-3 w-3" />
                    <span>Value</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Click for details
                  </div>
                </div>
                <ResultPreview result={inputData.result} compact={true} />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>{fields.length} field{fields.length > 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Output Handles - one for each field */}
      {fields.map((field, index) => {
        // Calculate position below the header using base height
        const contentHeight = baseHeight - headerHeight;
        const topPosition = `${headerHeight + ((index + 1) / (fields.length + 1)) * contentHeight}px`;

        return (
          <div key={field.name}>
            <Handle
              type="source"
              position={Position.Right}
              id={field.name}
              style={{ top: topPosition, position: 'absolute' }}
              className="w-3 h-3 !bg-blue-500 !border-2 !border-white dark:!border-gray-800 hover:!scale-150 transition-transform"
              title={`${field.name} (${field.type})`}
            />
            {/* Label - appears inside the node next to handle when connecting */}
            {isConnecting && (
              <div
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: topPosition,
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  zIndex: 1000,
                }}
                className="text-xs font-medium text-blue-900 dark:text-blue-100 bg-blue-100/90 dark:bg-blue-900/90 px-2 py-0.5 rounded shadow-sm whitespace-nowrap border border-blue-300 dark:border-blue-700"
              >
                {field.name}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
});

InputNode.displayName = 'InputNode';

