'use client';

import { useState } from 'react';
import type { WorkflowNode, AgentNodeData, InputNodeData, TransformNodeData, WorkflowEdge } from '@/lib/workflows/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Trash2, Plus, Link2, AlertCircle } from 'lucide-react';
import { SchemaForm } from '@/components/editor/presets/form/schema-form';

interface NodeConfigProps {
  node: WorkflowNode;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onUpdate: (nodeId: string, data: Partial<WorkflowNode['data']>) => void;
  onDelete: (nodeId: string) => void;
  onClose: () => void;
}

export function NodeConfig({
  node,
  nodes,
  edges,
  onUpdate,
  onDelete,
  onClose,
}: NodeConfigProps) {
  const [localData, setLocalData] = useState(node.data);

  const handleSave = () => {
    onUpdate(node.id, localData);
  };

  // Helper function to get node display name
  const getNodeDisplayName = (node: WorkflowNode): string => {
    // First try data.label (for Input/Output nodes)
    if (node.data.label) {
      return node.data.label;
    }
    
    // Then try agentName for Agent nodes
    const agentData = node.data as AgentNodeData;
    if (agentData.agentName) {
      return agentData.agentName;
    }
    
    // Fallback to node type
    return node.type.charAt(0).toUpperCase() + node.type.slice(1);
  };

  // Find incoming connections
  const connectedInputs = edges
    .filter(edge => edge.target === node.id)
    .map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      return {
        targetHandle: edge.targetHandle,
        sourceNodeName: sourceNode ? getNodeDisplayName(sourceNode) : 'Unknown Node',
        sourceHandle: edge.sourceHandle,
        sourceNodeType: sourceNode?.type
      };
    });

  const renderConnectedInputs = () => {
    if (connectedInputs.length === 0) return null;

    return (
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Link2 className="h-4 w-4 text-blue-500" />
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">Connected Inputs</h4>
        </div>
        <div className="space-y-2">
          {connectedInputs.map((conn, idx) => (
            <div key={idx} className="bg-white dark:bg-black/20 p-2.5 rounded border border-blue-100 dark:border-blue-900">
              <div className="text-xs">
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="font-semibold text-blue-700 dark:text-blue-300">{conn.targetHandle || 'Input'}</span>
                  <span className="text-muted-foreground">receives data from:</span>
                </div>
                <div className="flex items-center gap-1.5 ml-3 text-muted-foreground">
                  <span className="text-[10px]">↳</span>
                  <span className="font-medium text-green-700 dark:text-green-400">"{conn.sourceHandle}"</span>
                  <span className="text-[10px]">field in</span>
                  <span className="font-medium text-foreground">"{conn.sourceNodeName}"</span>
                  <span className="text-[10px]">node</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-start gap-2 mt-3 text-xs text-blue-700 dark:text-blue-300">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <p>Connected values override default configuration.</p>
        </div>
      </div>
    );
  };

  const renderAgentConfig = () => {
    const data = localData as AgentNodeData;

    return (
      <div className="space-y-4">
        <div>
          <Label className="text-xs">Agent</Label>
          <p className="text-sm font-medium">{data.agentName}</p>
          <p className="text-xs text-muted-foreground">{data.agentPath}</p>
        </div>

        {renderConnectedInputs()}

        <Separator />

        {data.inputSchema && (
          <SchemaForm
            schema={data.inputSchema}
            value={data.config || {}}
            onChange={(newConfig) => {
              setLocalData({
                ...data,
                config: newConfig,
              });
            }}
            title="Configuration"
            description="Configure default values for inputs"
            showTabs={true}
            showResetButton={true}
            className=""
          />
        )}

        <Button onClick={handleSave} className="w-full" size="sm">
          Save Configuration
        </Button>
      </div>
    );
  };

  const renderInputConfig = () => {
    const data = localData as InputNodeData;
    const fields = data.fields || [];

    return (
      <div className="space-y-4">
        <div>
          <Label className="text-xs">Input Fields</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Define the input fields for this workflow
          </p>
        </div>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={index} className="border rounded p-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Field {index + 1}</Label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => {
                    const newFields = fields.filter((_, i) => i !== index);
                    setLocalData({ ...data, fields: newFields });
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
              <div>
                <Label className="text-xs">Field Name</Label>
                <Input
                  placeholder="Field name"
                  value={field.name}
                  onChange={e => {
                    const newFields = [...fields];
                    newFields[index] = { ...field, name: e.target.value };
                    setLocalData({ ...data, fields: newFields });
                  }}
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={field.type}
                  onValueChange={value => {
                    const newFields = [...fields];
                    newFields[index] = { ...field, type: value as any };
                    setLocalData({ ...data, fields: newFields });
                  }}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="array">Array</SelectItem>
                    <SelectItem value="media">Media URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Default Value</Label>
                <Input
                  placeholder="Enter default value"
                  value={field.value || ''}
                  onChange={e => {
                    const newFields = [...fields];
                    newFields[index] = { ...field, value: e.target.value };
                    setLocalData({ ...data, fields: newFields });
                  }}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You can use variables like {`{{variableName}}`}
                </p>
              </div>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => {
            setLocalData({
              ...data,
              fields: [
                ...fields,
                { name: `field${fields.length + 1}`, type: 'text', value: '' },
              ],
            });
          }}
        >
          <Plus className="mr-2 h-3 w-3" />
          Add Field
        </Button>

        <Button onClick={handleSave} className="w-full" size="sm">
          Save Configuration
        </Button>
      </div>
    );
  };

  const renderTransformConfig = () => {
    const data = localData as TransformNodeData;

    return (
      <div className="space-y-4">
        {renderConnectedInputs()}

        <div>
          <Label className="text-xs">Operation Type</Label>
          <Select
            value={data.operation}
            onValueChange={value => {
              setLocalData({ ...data, operation: value as any });
            }}
          >
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="map">Map</SelectItem>
              <SelectItem value="filter">Filter</SelectItem>
              <SelectItem value="reduce">Reduce</SelectItem>
              <SelectItem value="merge">Merge</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Expression</Label>
          <p className="text-xs text-muted-foreground mb-2">
            JavaScript expression to transform the data
          </p>
          <Textarea
            value={data.expression || ''}
            onChange={e =>
              setLocalData({ ...data, expression: e.target.value })
            }
            placeholder="input => input.toUpperCase()"
            rows={4}
            className="text-sm font-mono"
          />
        </div>

        <Button onClick={handleSave} className="w-full" size="sm">
          Save Configuration
        </Button>
      </div>
    );
  };

  return (
    <div className="w-96 border-l bg-background flex flex-col h-full">
      <div className="p-4 border-b flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Node Configuration</h3>
            <p className="text-xs text-muted-foreground">
              {node.type} node
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 h-0">
        <div className="p-4">
          {node.type === 'agent' && renderAgentConfig()}
          {node.type === 'input' && renderInputConfig()}
          {node.type === 'output' && (
            <div className="space-y-4">
              {renderConnectedInputs()}
              <p className="text-sm text-muted-foreground">
                Output nodes collect results automatically. No configuration needed.
              </p>
            </div>
          )}
          {node.type === 'transform' && renderTransformConfig()}
        </div>
      </ScrollArea>

      <div className="p-4 border-t flex-shrink-0">
        <div className="space-y-2">
          <div className="text-xs">
            <p className="text-muted-foreground">Node ID</p>
            <code className="text-xs bg-muted px-1 rounded">{node.id}</code>
          </div>
          <Button
            variant="destructive"
            onClick={() => onDelete(node.id)}
            className="w-full"
            size="sm"
          >
            <Trash2 className="mr-2 h-3 w-3" />
            Delete Node
          </Button>
        </div>
      </div>
    </div>
  );
}

