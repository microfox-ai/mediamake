'use client';

import { useState, useCallback, useEffect, useRef, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';

// Context to share connection state and node actions with nodes
const ConnectionContext = createContext<{ 
  isConnecting: boolean;
  onRunNode?: (nodeId: string) => void;
}>({ isConnecting: false });
export const useConnectionContext = () => useContext(ConnectionContext);
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  BackgroundVariant,
  Panel,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowVariable,
  ExecutionStatus,
  ExecutionProgressCallback,
} from '@/lib/workflows/types';
import { nodeTypes } from './nodeTypes';
import { edgeTypes } from './edgeTypes';
import { NodeLibrary } from './panels/NodeLibrary';
import { NodeConfig } from './panels/NodeConfig';
import { ExecutionPanel } from './panels/ExecutionPanel';
import { VariablePanel } from './panels/VariablePanel';
import { workflowDB } from '@/lib/workflows/indexeddb';
import { rehydrateAgentSchemas } from '@/lib/workflows/schemaRehydration';
import { validateConnection } from '@/lib/workflows/validator';
import { ConnectionProvider, useConnection } from './ConnectionContext';
import { Button } from '@/components/ui/button';
import { Save, ArrowLeft } from 'lucide-react';

interface WorkflowEditorProps {
  workflowId: string;
}

// DropZone component that handles drag and drop from the node library
interface DropZoneProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onNodesChange: any;
  onEdgesChange: any;
  onConnect: any;
  isValidConnection: any;
  onNodeClick: any;
  onPaneClick: any;
  onAddNode: (node: WorkflowNode) => void;
  createNodeFromItem: (item: any, position: { x: number; y: number }) => WorkflowNode;
  onConnectStart: () => void;
  onConnectEnd: () => void;
}

function DropZone({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  isValidConnection,
  onNodeClick,
  onPaneClick,
  onAddNode,
  createNodeFromItem,
  onConnectStart,
  onConnectEnd,
}: DropZoneProps) {
  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData('application/reactflow');
      if (!data) {
        return;
      }

      const item = JSON.parse(data);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = createNodeFromItem(item, position);
      onAddNode(newNode);
    },
    [screenToFlowPosition, createNodeFromItem, onAddNode],
  );

  return (
    <div className="flex-1 relative" onDrop={onDrop} onDragOver={onDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: 'data' }}
        fitView
        deleteKeyCode="Delete"
      >
        <Background variant={BackgroundVariant.Dots} />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

export function WorkflowEditor({ workflowId }: WorkflowEditorProps) {
  const router = useRouter();
  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowNode>([]);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState<WorkflowEdge>([]);
  
  // Wrap onEdgesChange to detect deletions and clear affected node results
  const onEdgesChange = useCallback((changes: any[]) => {
    // Check for removed edges
    const removedEdges = changes.filter(change => change.type === 'remove');
    
    if (removedEdges.length > 0) {
      // Find all target nodes affected by deleted edges
      const affectedTargets = new Set<string>();
      removedEdges.forEach(change => {
        const edge = edges.find(e => e.id === change.id);
        if (edge) {
          affectedTargets.add(edge.target);
        }
      });
      
      // Clear results for affected nodes
      if (affectedTargets.size > 0) {
        setNodes(nds =>
          nds.map(node =>
            affectedTargets.has(node.id)
              ? { ...node, data: { ...node.data, result: undefined, status: 'idle' } }
              : node
          )
        );
        console.log('🔄 Cleared results for nodes with deleted connections:', Array.from(affectedTargets));
      }
    }
    
    // Pass through to original handler
    onEdgesChangeInternal(changes);
  }, [edges, setNodes, onEdgesChangeInternal]);
  const [selectedNode, setSelectedNode] = useState<WorkflowNode | null>(null);
  const [workflowName, setWorkflowName] = useState('Untitled Workflow');
  const [workflowDescription, setWorkflowDescription] = useState('');
  const [variables, setVariables] = useState<WorkflowVariable[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false); // Track connection drag state
  const autoSaveTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  // Load workflow on mount
  useEffect(() => {
    loadWorkflow();
  }, [workflowId]);

  // Auto-save on changes
  useEffect(() => {
    if (!isLoading) {
      scheduleAutoSave();
    }
  }, [nodes, edges, variables, workflowName, workflowDescription]);

  const loadWorkflow = async () => {
    try {
      setIsLoading(true);
      console.log(`🔍 Loading workflow: ${workflowId}`);

      // Try to load from MongoDB first (source of truth)
      const response = await fetch(
        `/api/workflows/${workflowId}?userId=demo-user`,
      );
      const data = await response.json();

      console.log(`📥 MongoDB response:`, {
        success: data.success,
        hasData: !!data.data,
        nodes: data.data?.nodes?.length || 0,
        edges: data.data?.edges?.length || 0,
      });

      if (data.success && data.data) {
        const workflow = data.data;
        // Rehydrate agent schemas that were stripped during save
        const rehydratedNodes = rehydrateAgentSchemas(workflow.nodes);
        console.log(`✅ Rehydrated nodes from MongoDB:`, rehydratedNodes.length);
        
        setNodes(rehydratedNodes);
        setEdges(workflow.edges);
        setVariables(workflow.variables || []);
        setWorkflowName(workflow.name);
        setWorkflowDescription(workflow.description || '');
        
        // Clear any stale IndexedDB draft
        await workflowDB.deleteDraft(workflowId);
        console.log(`🗑️  Cleared stale IndexedDB draft`);
        
        setIsLoading(false);
        return;
      }

      // If not in MongoDB, try IndexedDB draft as fallback
      console.log(`📡 Not in MongoDB, checking IndexedDB...`);
      const draft = await workflowDB.getDraft(workflowId);
      if (draft && draft.nodes?.length > 0) {
        console.log(`📂 Found draft in IndexedDB:`, {
          nodes: draft.nodes?.length || 0,
          edges: draft.edges?.length || 0,
        });
        
        // Rehydrate agent schemas that were stripped during save
        const rehydratedNodes = rehydrateAgentSchemas(draft.nodes);
        console.log(`✅ Rehydrated nodes from draft:`, rehydratedNodes.length);
        
        setNodes(rehydratedNodes);
        setEdges(draft.edges);
        setVariables(draft.variables || []);
        setWorkflowName(draft.name);
        setWorkflowDescription(draft.description || '');
      } else {
        console.log(`ℹ️  New workflow - starting with empty canvas`);
        // New workflow
        setNodes([]);
        setEdges([]);
        setVariables([]);
      }
    } catch (error) {
      console.error('❌ Failed to load workflow:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const scheduleAutoSave = () => {
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    autoSaveTimeout.current = setTimeout(() => {
      saveToIndexedDB();
    }, 2000); // Auto-save after 2 seconds of inactivity
  };

  const saveToIndexedDB = async () => {
    try {
      const workflow: WorkflowDefinition = {
        id: workflowId,
        name: workflowName,
        description: workflowDescription,
        nodes,
        edges,
        variables,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await workflowDB.saveDraft({
        ...workflow,
        lastSaved: new Date(),
        isDraft: true,
        syncedToMongo: false,
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const saveToMongoDB = async () => {
    try {
      setIsSaving(true);

      const workflow: WorkflowDefinition = {
        id: workflowId,
        name: workflowName,
        description: workflowDescription,
        nodes,
        edges,
        variables,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflow,
          userId: 'demo-user',
        }),
      });

      const data = await response.json();

      if (data.success) {
        await workflowDB.markAsSynced(workflowId);
        // Show success message
        console.log('Workflow saved successfully');
      }
    } catch (error) {
      console.error('Failed to save workflow:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Validate connection based on types
  const isValidConnection = useCallback(
    (connection: Connection | WorkflowEdge): boolean => {
      const sourceNode = nodes.find(n => n.id === connection.source);
      const targetNode = nodes.find(n => n.id === connection.target);

      if (!sourceNode || !targetNode) {
        return false;
      }

      // Handle both null and undefined for handles
      const sourceHandle = connection.sourceHandle ?? null;
      const targetHandle = connection.targetHandle ?? null;

      const validation = validateConnection(
        sourceNode,
        sourceHandle,
        targetNode,
        targetHandle,
      );

      if (!validation.valid) {
        console.warn('Connection validation failed:', validation.error);
      }

      return validation.valid;
    },
    [nodes],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      // Check for duplicate connections
      setEdges(eds => {
        const isDuplicate = eds.some(
          edge =>
            edge.source === connection.source &&
            edge.target === connection.target &&
            edge.sourceHandle === connection.sourceHandle &&
            edge.targetHandle === connection.targetHandle,
        );

        if (isDuplicate) {
          console.warn('Duplicate connection prevented:', connection);
          return eds;
        }

        // Add edge with custom type
        const newEdge: WorkflowEdge = {
          id: `${connection.source}-${connection.target}-${Date.now()}`,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle || undefined,
          targetHandle: connection.targetHandle || undefined,
          type: 'data', // Use our custom DataEdge component
        };
        return addEdge(newEdge, eds);
      });
      
      // Clear result of target node when new connection is made
      if (connection.target) {
        setNodes(nds =>
          nds.map(node =>
            node.id === connection.target
              ? { ...node, data: { ...node.data, result: undefined, status: 'idle' } }
              : node
          )
        );
        console.log('🔄 Cleared result for target node:', connection.target);
      }
    },
    [setEdges, setNodes],
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: WorkflowNode) => {
      setSelectedNode(node);
    },
    [],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const updateNodeData = useCallback(
    (nodeId: string, data: Partial<WorkflowNode['data']>) => {
      setNodes(nds =>
        nds.map(node =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, ...data } }
            : node,
        ),
      );
    },
    [setNodes],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes(nds => nds.filter(node => node.id !== nodeId));
      setEdges(eds =>
        eds.filter(edge => edge.source !== nodeId && edge.target !== nodeId),
      );
      setSelectedNode(null);
    },
    [setNodes, setEdges],
  );

  const handleNodeUpdate = useCallback(
    (nodeId: string, status: ExecutionStatus, result?: any, error?: any) => {
      setNodes(nds =>
        nds.map(node =>
          node.id === nodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  status,
                  result,
                  error: error?.message || error,
                },
              }
            : node,
        ),
      );
    },
    [setNodes],
  );

  // Handle connection start (when dragging begins)
  const handleConnectStart = useCallback(() => {
    console.log('Connection drag started!');
    setIsConnecting(true);
  }, []);

  // Handle connection end (when dragging ends)
  const handleConnectEnd = useCallback(() => {
    console.log('Connection drag ended!');
    setIsConnecting(false);
  }, []);

  // Execute a single node
  const runSingleNode = useCallback(async (nodeId: string) => {
    const nodeToRun = nodes.find(n => n.id === nodeId);
    if (!nodeToRun) {
      console.error('Node not found:', nodeId);
      return;
    }

    console.log('🎯 Running single node:', nodeId);
    
    // Clear the target node's result first to force re-execution
    setNodes(nds =>
      nds.map(node =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, result: undefined, status: 'running' } }
          : node
      )
    );

    try {
      // Import executor dynamically
      const { WorkflowExecutor } = await import('@/lib/workflows/executor');
      
      // Find all incoming edges to this node
      const incomingEdges = edges.filter(e => e.target === nodeId);
      
      // Find all source nodes that feed into this node
      const sourceNodeIds = [...new Set(incomingEdges.map(e => e.source))];
      const sourceNodes = nodes.filter(n => sourceNodeIds.includes(n.id));
      
      // Create a workflow with this node AND all its source nodes
      // Important: Clear the target node's result in the workflow definition
      const singleNodeWorkflow = {
        id: workflowId,
        name: workflowName,
        description: workflowDescription,
        nodes: [
          ...sourceNodes, // Source nodes with their cached results
          { ...nodeToRun, data: { ...nodeToRun.data, result: undefined, status: 'idle' as const } } // Target node cleared
        ],
        edges: incomingEdges, // Only incoming edges
        variables,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      console.log('🔄 Single node workflow:', {
        targetNode: nodeId,
        sourceNodes: sourceNodes.map(n => ({ id: n.id, hasResult: !!n.data.result })),
        edges: incomingEdges.length,
      });

      // Progress callback adapter
      const onProgress: ExecutionProgressCallback = ({ nodeId, status, result, error }) => {
        handleNodeUpdate(nodeId, status, result, error);
      };

      // Execute (skip already-executed source nodes, use their cached results)
      const executor = new WorkflowExecutor(singleNodeWorkflow, onProgress);
      const results = await executor.execute(true); // true = skip already-executed source nodes
      
      // Get the result for this specific node
      const result = results.get(nodeId);
      handleNodeUpdate(nodeId, 'success', result);
      
      console.log('✅ Single node execution completed:', { nodeId, result });
    } catch (error) {
      console.error('❌ Single node execution failed:', error);
      handleNodeUpdate(nodeId, 'error', undefined, error);
    }
  }, [nodes, edges, variables, workflowId, workflowName, workflowDescription, handleNodeUpdate]);

  // Helper function to create a node from library item (for drag & drop)
  const createNodeFromItem = useCallback((item: any, position: { x: number; y: number }): WorkflowNode => {
    const nodeId = `${item.type}-${Date.now()}`;
    const baseNode: WorkflowNode = {
      id: nodeId,
      type: item.type,
      position,
      data: {
        label: item.label,
      },
    };

    // Nodes now have fixed sizes defined in their components
    switch (item.type) {
      case 'agent':
        baseNode.data = {
          agentPath: item.metadata.path,
          agentName: item.metadata.name,
          icon: item.metadata.icon,
          inputSchema: item.metadata.inputSchema,
          outputSchema: item.metadata.outputSchema,
          description: item.metadata.description,
          config: {},
        };
        break;
      case 'input':
        baseNode.data = {
          label: item.label, // Preserve label
          fields: [
            { name: 'input', type: 'text', value: '' },
          ],
        };
        break;
      case 'output':
        baseNode.data = {
          label: item.label, // Preserve label
          fields: [
            { name: 'result', type: 'text' },
          ],
        };
        break;
      case 'transform':
        baseNode.data = {
          label: item.label, // Preserve label
          operation: 'custom',
          expression: 'input => input',
        };
        break;
    }

    return baseNode;
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading workflow...</p>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <ConnectionContext.Provider value={{ isConnecting, onRunNode: runSingleNode }}>
        <div className="flex h-screen w-full flex-col">
        {/* Top Panel - Execution Controls */}
        <ExecutionPanel
          workflowName={workflowName}
          onWorkflowNameChange={setWorkflowName}
          onSave={saveToMongoDB}
          isSaving={isSaving}
          onBack={() => router.push('/workflows')}
          workflow={{
            id: workflowId,
            name: workflowName,
            description: workflowDescription,
            nodes,
            edges,
            variables,
            createdAt: new Date(),
            updatedAt: new Date(),
          }}
          onNodeUpdate={handleNodeUpdate}
        />

        {/* Main Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Panel - Node Library */}
          <NodeLibrary onAddNode={node => setNodes(nds => [...nds, node])} />

          {/* Center - React Flow Canvas */}
          <DropZone
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onAddNode={node => setNodes(nds => [...nds, node])}
            createNodeFromItem={createNodeFromItem}
            onConnectStart={handleConnectStart}
            onConnectEnd={handleConnectEnd}
          />

          {/* Right Panel - Node Configuration */}
          {selectedNode && (
            <NodeConfig
              node={selectedNode}
              nodes={nodes}
              edges={edges}
              onUpdate={updateNodeData}
              onDelete={deleteNode}
              onClose={() => setSelectedNode(null)}
            />
          )}
        </div>

        {/* Bottom Panel - Variables */}
        <VariablePanel variables={variables} onVariablesChange={setVariables} />
        </div>
      </ConnectionContext.Provider>
    </ReactFlowProvider>
  );
}

