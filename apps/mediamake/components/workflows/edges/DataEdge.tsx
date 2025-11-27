import { memo, useState } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  useReactFlow,
} from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { WorkflowEdge } from '@/lib/workflows/types';

export const DataEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
    selected,
  }: EdgeProps<WorkflowEdge>) => {
    const { setEdges } = useReactFlow();
    const [isHovered, setIsHovered] = useState(false);
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    const edgeData = data as WorkflowEdge['data'];
    const isInvalid = edgeData?.sourceType && edgeData?.targetType &&
      edgeData.sourceType !== edgeData.targetType &&
      edgeData.targetType !== 'any';

    const onDelete = () => {
      setEdges((edges) => edges.filter((edge) => edge.id !== id));
    };

    const showDeleteButton = selected || isHovered;

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            ...style,
            stroke: isInvalid ? '#ef4444' : selected ? '#3b82f6' : isHovered ? '#60a5fa' : '#94a3b8',
            strokeWidth: selected ? 3 : isHovered ? 2.5 : 2,
          }}
        />
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan flex items-center gap-2"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {edgeData && (edgeData.label || edgeData.sourceType) && (
              <Badge
                variant={isInvalid ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {edgeData.label || edgeData.sourceType}
              </Badge>
            )}
            {/* Show delete button when selected or hovered */}
            {showDeleteButton && (
              <Button
                onClick={onDelete}
                variant="destructive"
                size="icon"
                className="h-7 w-7 rounded-full shadow-lg"
                title="Delete connection (or press Delete key)"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </EdgeLabelRenderer>
      </>
    );
  },
);

DataEdge.displayName = 'DataEdge';

