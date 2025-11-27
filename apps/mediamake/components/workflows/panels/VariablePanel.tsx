'use client';

import { useState } from 'react';
import type { WorkflowVariable, WorkflowDataType } from '@/lib/workflows/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Variable } from 'lucide-react';

interface VariablePanelProps {
  variables: WorkflowVariable[];
  onVariablesChange: (variables: WorkflowVariable[]) => void;
}

export function VariablePanel({
  variables,
  onVariablesChange,
}: VariablePanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVariable, setEditingVariable] = useState<WorkflowVariable | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'text' as WorkflowDataType,
    value: '',
    description: '',
  });

  const openAddDialog = () => {
    setEditingVariable(null);
    setFormData({
      name: '',
      type: 'text',
      value: '',
      description: '',
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (variable: WorkflowVariable) => {
    setEditingVariable(variable);
    setFormData({
      name: variable.name,
      type: variable.type,
      value: String(variable.value || ''),
      description: variable.description || '',
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.name) return;

    const newVariable: WorkflowVariable = {
      id: editingVariable?.id || `var-${Date.now()}`,
      name: formData.name,
      type: formData.type,
      value: formData.value,
      description: formData.description,
    };

    if (editingVariable) {
      // Update existing
      onVariablesChange(
        variables.map(v => (v.id === editingVariable.id ? newVariable : v)),
      );
    } else {
      // Add new
      onVariablesChange([...variables, newVariable]);
    }

    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this variable?')) {
      onVariablesChange(variables.filter(v => v.id !== id));
    }
  };

  return (
    <div className="border-t bg-background p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Variable className="h-4 w-4" />
          <h4 className="font-semibold text-sm">Workflow Variables</h4>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" onClick={openAddDialog}>
              <Plus className="h-3 w-3 mr-1" />
              Add Variable
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingVariable ? 'Edit Variable' : 'Add Variable'}
              </DialogTitle>
              <DialogDescription>
                Define a variable to use across your workflow
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Variable Name</Label>
                <Input
                  value={formData.name}
                  onChange={e =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="myVariable"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={value =>
                    setFormData({ ...formData, type: value as WorkflowDataType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="array">Array</SelectItem>
                    <SelectItem value="media">Media URL</SelectItem>
                    <SelectItem value="object">Object</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Value</Label>
                <Input
                  value={formData.value}
                  onChange={e =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                  placeholder="Initial value"
                />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Input
                  value={formData.description}
                  onChange={e =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="What this variable is for"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {variables.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          No variables defined. Use{' '}
          <code className="bg-muted px-1 rounded">{'{{variableName}}'}</code> to
          reference variables in nodes.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {variables.map(variable => (
            <div
              key={variable.id}
              className="flex items-center gap-2 bg-muted rounded px-2 py-1 text-sm group"
            >
              <code className="font-mono">{'{{'}
                {variable.name}
                {'}}'}</code>
              <Badge variant="secondary" className="text-xs">
                {variable.type}
              </Badge>
              <div className="hidden group-hover:flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={() => openEditDialog(variable)}
                >
                  <span className="text-xs">✏️</span>
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5"
                  onClick={() => handleDelete(variable.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

