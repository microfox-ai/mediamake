import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { WorkflowNode, AgentNodeData } from '@/lib/workflows/types';
import { generateInputHandles, generateOutputHandles } from '@/lib/workflows/schemaParser';
import { Loader2, CheckCircle, XCircle, AlertCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useConnectionContext } from '../WorkflowEditor';
import { Button } from '@/components/ui/button';

export const AgentNode = memo(({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const agentData = data as AgentNodeData & { status?: string; error?: string; result?: any };
  
  // Get connection state and run function from context
  const { isConnecting, onRunNode } = useConnectionContext();
  
  const handleRunNode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRunNode) {
      onRunNode(id);
    }
  };
  
  const inputHandles = agentData.inputSchema ? generateInputHandles(agentData.inputSchema) : [];
  const outputHandles = agentData.outputSchema ? generateOutputHandles(agentData.outputSchema) : [];

  // Calculate dynamic height based on number of handles
  const maxHandles = Math.max(inputHandles.length, outputHandles.length, 1);
  const headerHeight = 40;
  const minContentHeight = 80;
  const handleSpacing = 32; // Space per handle
  const dynamicHeight = headerHeight + Math.max(minContentHeight, maxHandles * handleSpacing);

  const statusIcon = {
    idle: null,
    running: <Loader2 className="h-3 w-3 animate-spin text-blue-500" />,
    success: <CheckCircle className="h-3 w-3 text-green-500" />,
    error: <XCircle className="h-3 w-3 text-red-500" />,
    warning: <AlertCircle className="h-3 w-3 text-yellow-500" />,
  }[agentData.status || 'idle'];

  return (
    <>
      <div
        style={{ height: `${dynamicHeight}px` }}
        className={cn(
          'bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900',
          'border-2 rounded-lg shadow-md overflow-hidden',
          'w-[240px]',
          selected ? 'border-purple-500 ring-2 ring-purple-500 ring-offset-2' : 'border-purple-300 dark:border-purple-700',
          agentData.status === 'running' && 'border-blue-500 animate-pulse',
          agentData.status === 'success' && 'border-green-500',
          agentData.status === 'error' && 'border-red-500',
        )}
      >
        {/* Header - Always at the top */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-purple-200/50 dark:border-purple-800/50">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {agentData.icon && (
              <span className="text-lg flex-shrink-0">{agentData.icon}</span>
            )}
            <h3 className="font-semibold text-sm text-purple-900 dark:text-purple-100 truncate">
              {agentData.agentName || 'Agent'}
            </h3>
          </div>
          <div className="flex items-center gap-1">
            {/* Run button - only show when not running */}
            {agentData.status !== 'running' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 nodrag hover:bg-purple-200 dark:hover:bg-purple-800"
                onClick={handleRunNode}
                title="Run this node"
              >
                <Play className="h-3 w-3 text-purple-700 dark:text-purple-300" />
              </Button>
            )}
            {statusIcon}
          </div>
        </div>

        {/* Content - Hide description when connecting to avoid overlap with labels */}
        {!isConnecting && (
          <div className="p-3">
            {/* Description */}
            {agentData.description ? (
              <p className="text-xs text-muted-foreground line-clamp-4 leading-relaxed">
                {agentData.description}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">
                No description available
              </p>
            )}
          </div>
        )}
      </div>

      {/* Input Handles - Left side */}
      {inputHandles.map((handle, index) => {
        // Calculate position below the header using dynamic height
        const contentHeight = dynamicHeight - headerHeight;
        const topPosition = `${headerHeight + ((index + 1) / (inputHandles.length + 1)) * contentHeight}px`;

        return (
          <div key={handle.id}>
            <Handle
              type="target"
              position={Position.Left}
              id={handle.id}
              title={`Input: ${handle.label} (${handle.type})`}
              style={{ top: topPosition }}
              className="w-3 h-3 !bg-blue-500 !border-2 !border-white dark:!border-gray-800 hover:!scale-150 transition-transform"
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
                className="text-xs font-medium text-blue-900 dark:text-blue-100 bg-blue-100/90 dark:bg-blue-900/90 px-2 py-0.5 rounded shadow-sm whitespace-nowrap border border-blue-300 dark:border-blue-700"
              >
                {handle.label}
              </div>
            )}
          </div>
        );
      })}

      {/* Output Handles - Right side */}
      {outputHandles.map((handle, index) => {
        // Calculate position below the header using dynamic height
        const contentHeight = dynamicHeight - headerHeight;
        const topPosition = `${headerHeight + ((index + 1) / (outputHandles.length + 1)) * contentHeight}px`;

        return (
          <div key={handle.id}>
            <Handle
              type="source"
              position={Position.Right}
              id={handle.id}
              title={`Output: ${handle.label} (${handle.type})`}
              style={{ top: topPosition }}
              className="w-3 h-3 !bg-green-500 !border-2 !border-white dark:!border-gray-800 hover:!scale-150 transition-transform"
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
                className="text-xs font-medium text-green-900 dark:text-green-100 bg-green-100/90 dark:bg-green-900/90 px-2 py-0.5 rounded shadow-sm whitespace-nowrap border border-green-300 dark:border-green-700"
              >
                {handle.label}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
});

AgentNode.displayName = 'AgentNode';

