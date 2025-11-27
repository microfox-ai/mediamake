'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Search,
  Workflow as WorkflowIcon,
  Calendar,
  Play,
  Trash2,
} from 'lucide-react';
import type { WorkflowDefinition } from '@/lib/workflows/types';

export function WorkflowList() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/workflows?userId=demo-user');
      const data = await response.json();

      if (data.success) {
        setWorkflows(data.data.workflows);
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewWorkflow = () => {
    const newId = `workflow-${Date.now()}`;
    router.push(`/workflows/${newId}`);
  };

  const openWorkflow = (id: string) => {
    router.push(`/workflows/${id}`);
  };

  const deleteWorkflow = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/workflows/${id}?userId=demo-user`,
        {
          method: 'DELETE',
        },
      );

      if (response.ok) {
        loadWorkflows();
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  const filteredWorkflows = workflows.filter(
    workflow =>
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WorkflowIcon className="h-6 w-6" />
          <h2 className="text-2xl font-bold">My Workflows</h2>
        </div>
        <Button onClick={createNewWorkflow}>
          <Plus className="mr-2 h-4 w-4" />
          New Workflow
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search workflows..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Workflows Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading workflows...</p>
        </div>
      ) : filteredWorkflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <WorkflowIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium mb-2">No workflows yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first workflow to get started
            </p>
            <Button onClick={createNewWorkflow}>
              <Plus className="mr-2 h-4 w-4" />
              Create Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredWorkflows.map(workflow => (
            <Card
              key={workflow.id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => openWorkflow(workflow.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {workflow.name}
                    </CardTitle>
                    {workflow.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {workflow.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={e => deleteWorkflow(workflow.id, e)}
                    className="ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{workflow.nodes.length} nodes</span>
                    <span>{workflow.edges.length} connections</span>
                  </div>

                  {/* Tags */}
                  {workflow.tags && workflow.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {workflow.tags.slice(0, 3).map(tag => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {workflow.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{workflow.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Date */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>
                      Updated{' '}
                      {new Date(workflow.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

