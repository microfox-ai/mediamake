'use client';

import { useState, useMemo } from 'react';
import { aiRouterRegistry } from '@/app/ai';
import type { WorkflowNode, AgentMetadata, NodeLibraryItem } from '@/lib/workflows/types';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  ArrowRightCircle,
  CheckCircle,
  Shuffle,
  Workflow,
} from 'lucide-react';

interface NodeLibraryProps {
  onAddNode: (node: WorkflowNode) => void;
}

export function NodeLibrary({ onAddNode }: NodeLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Discover agents from registry
  const agents: AgentMetadata[] = useMemo(() => {
    return Object.entries(aiRouterRegistry.map)
      .filter(
        ([path, value]) =>
          value.agents[0]?.actAsTool && !value.agents[0]?.actAsTool.metadata?.hideUI,
      )
      .map(([path, value]) => {
        const agent = value.agents[0];
        return {
          path,
          name: agent.actAsTool!.name,
          description: agent.actAsTool!.description,
          icon: agent.actAsTool!.metadata?.icon as string,
          inputSchema: agent.actAsTool!.inputSchema,
          outputSchema: agent.actAsTool!.outputSchema,
          tags: agent.actAsTool!.metadata?.tags as string[],
        };
      });
  }, []);

  // Create node library items
  const libraryItems: NodeLibraryItem[] = useMemo(() => {
    const items: NodeLibraryItem[] = [
      {
        id: 'input',
        type: 'input',
        label: 'Input',
        icon: '📥',
        description: 'Starting point with user inputs',
        category: 'Core',
      },
      {
        id: 'output',
        type: 'output',
        label: 'Output',
        icon: '📤',
        description: 'End point to collect results',
        category: 'Core',
      },
      {
        id: 'transform',
        type: 'transform',
        label: 'Transform',
        icon: '🔄',
        description: 'Transform data',
        category: 'Core',
      },
      ...agents.map(agent => ({
        id: agent.path,
        type: 'agent' as const,
        label: agent.name,
        icon: agent.icon,
        description: agent.description,
        category: 'Agents',
        metadata: agent,
      })),
    ];
    return items;
  }, [agents]);

  // Filter items based on search
  const filteredItems = useMemo(() => {
    if (!searchQuery) return libraryItems;
    const query = searchQuery.toLowerCase();
    return libraryItems.filter(
      item =>
        item.label.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query),
    );
  }, [libraryItems, searchQuery]);

  // Group by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, NodeLibraryItem[]> = {};
    filteredItems.forEach(item => {
      if (!groups[item.category]) {
        groups[item.category] = [];
      }
      groups[item.category].push(item);
    });
    return groups;
  }, [filteredItems]);

  const addNode = (item: NodeLibraryItem, position?: { x: number; y: number }) => {
    const nodeId = `${item.type}-${Date.now()}`;
    const baseNode: WorkflowNode = {
      id: nodeId,
      type: item.type,
      position: position || { x: 250, y: 250 },
      data: {
        label: item.label,
      },
    };

    // Customize based on type - nodes now have fixed sizes defined in their components
    switch (item.type) {
      case 'agent':
        baseNode.data = {
          agentPath: item.metadata!.path,
          agentName: item.metadata!.name,
          icon: item.metadata!.icon,
          inputSchema: item.metadata!.inputSchema,
          outputSchema: item.metadata!.outputSchema,
          description: item.metadata!.description,
          config: {},
        };
        break;
      case 'input':
        baseNode.data = {
          fields: [
            { name: 'input', type: 'text', value: '' },
          ],
        };
        break;
      case 'output':
        baseNode.data = {
          fields: [
            { name: 'result', type: 'text' },
          ],
        };
        break;
      case 'transform':
        baseNode.data = {
          operation: 'custom',
          expression: 'input => input',
        };
        break;
    }

    onAddNode(baseNode);
  };

  const onDragStart = (event: React.DragEvent, item: NodeLibraryItem) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/reactflow', JSON.stringify(item));
  };

  return (
    <div className="w-72 border-r bg-background flex flex-col h-full">
      <div className="p-4 space-y-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5" />
          <h3 className="font-semibold">Node Library</h3>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ScrollArea className="flex-1 h-0">
        <div className="p-4 pt-0 space-y-4">
          {Object.entries(groupedItems).map(([category, items]) => (
            <div key={category} className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {category}
              </h4>
              <div className="space-y-1">
                {items.map(item => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className="w-full justify-start h-auto p-3 text-left cursor-grab active:cursor-grabbing"
                    onClick={() => addNode(item)}
                    draggable
                    onDragStart={(e) => onDragStart(e, item)}
                  >
                    <div className="flex items-start gap-2 w-full">
                      {item.icon && (
                        <span className="text-lg flex-shrink-0">
                          {item.icon}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {item.label}
                        </p>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
              {Object.keys(groupedItems).indexOf(category) <
                Object.keys(groupedItems).length - 1 && (
                <Separator className="my-2" />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

