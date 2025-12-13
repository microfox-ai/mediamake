import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { WorkflowNode, OutputNodeData } from '@/lib/workflows/types';
import { CheckCircle, Loader2, XCircle, Play, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConnectionContext } from '../WorkflowEditor';
import { Button } from '@/components/ui/button';
import { ResultPreview } from '../ResultPreview';

export const OutputNode = memo(({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const outputData = data as OutputNodeData & { status?: string; result?: any };
  const fields = outputData.fields || [];

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
  const minContentHeight = outputData.result ? 0 : 80; // No min if showing result
  const handleSpacing = 32; // Space per handle
  const baseHeight = headerHeight + Math.max(minContentHeight, fields.length * handleSpacing);
  const useAutoHeight = !!outputData.result;

  const statusIcon = {
    running: <Loader2 className="h-3 w-3 animate-spin text-blue-500" />,
    success: <CheckCircle className="h-3 w-3 text-green-500" />,
    error: <XCircle className="h-3 w-3 text-red-500" />,
  }[outputData.status || ''];

  return (
    <>
      {/* Invisible source handle to prevent ReactFlow from showing default connection point */}
      <Handle
        type="source"
        position={Position.Right}
        id="disabled"
        isConnectable={false}
        style={{ opacity: 0, pointerEvents: 'none' }}
      />
      
      <div
        style={useAutoHeight ? { minHeight: `${baseHeight}px` } : { height: `${baseHeight}px` }}
        className={cn(
          'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900',
          'border-2 rounded-lg shadow-sm overflow-hidden',
          'w-[280px]', // Wider for better content display
          selected ? 'border-green-500 ring-2 ring-green-500 ring-offset-2' : 'border-green-300 dark:border-green-700',
          outputData.status === 'running' && 'border-blue-500 animate-pulse',
          outputData.status === 'success' && 'border-green-500',
          outputData.status === 'error' && 'border-red-500',
        )}
      >
        {/* Header - Always at the top */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-green-200/50 dark:border-green-800/50">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            <h3 className="font-semibold text-sm text-green-900 dark:text-green-100">Output</h3>
          </div>
          <div className="flex items-center gap-1">
            {/* Run button */}
            {outputData.status !== 'running' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 nodrag hover:bg-green-200 dark:hover:bg-green-800"
                onClick={handleRunNode}
                title="Run this node"
              >
                <Play className="h-3 w-3 text-green-700 dark:text-green-300" />
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
            ) : outputData.result ? (
              <>
                <div className="flex items-center gap-2 justify-between">
                  <div className="text-xs font-medium flex items-center gap-1 text-green-600 dark:text-green-400">
                    <Eye className="h-3 w-3" />
                    <span>Result</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Click for details
                  </div>
                </div>
                <ResultPreview result={outputData.result} compact={true} />
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span>{fields.length} field{fields.length > 1 ? 's' : ''}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input Handles - one for each field */}
      {fields.map((field, index) => {
        // Calculate position below the header using base height
        const contentHeight = baseHeight - headerHeight;
        const topPosition = `${headerHeight + ((index + 1) / (fields.length + 1)) * contentHeight}px`;

        return (
          <div key={field.name}>
            <Handle
              type="target"
              position={Position.Left}
              id={field.name}
              style={{ top: topPosition }}
              className="w-3 h-3 !bg-green-500 !border-2 !border-white dark:!border-gray-800 hover:!scale-150 transition-transform"
              title={`${field.name} (${field.type})`}
            />
            {/* Label - appears inside the node next to handle when connecting */}
            {isConnecting && (
              <div
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: topPosition,
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  zIndex: 1000,
                }}
                className="text-xs font-medium text-green-900 dark:text-green-100 bg-green-100/90 dark:bg-green-900/90 px-2 py-0.5 rounded shadow-sm whitespace-nowrap border border-green-300 dark:border-green-700"
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

OutputNode.displayName = 'OutputNode';

