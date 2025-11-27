import { getDatabase } from '../mongodb';
import type {
  WorkflowDocument,
  WorkflowExecutionDocument,
  ListWorkflowsParams,
} from '@/app/types/workflows';
import type { WorkflowDefinition, WorkflowExecution } from './types';

const WORKFLOWS_COLLECTION = 'workflows';
const EXECUTIONS_COLLECTION = 'workflow_executions';

// Convert WorkflowDefinition to MongoDB document
function toWorkflowDocument(
  workflow: WorkflowDefinition,
  userId: string,
): WorkflowDocument {
  return {
    ...workflow,
    userId,
    version: 1,
    createdAt: workflow.createdAt || new Date(),
    updatedAt: new Date(),
  };
}

// Convert MongoDB document to WorkflowDefinition
function fromWorkflowDocument(doc: WorkflowDocument): WorkflowDefinition {
  const { _id, userId, version, executions, deletedAt, ...workflow } = doc;
  return {
    ...workflow,
    id: _id || workflow.id,
  } as WorkflowDefinition;
}

/**
 * Save a workflow to MongoDB
 */
export async function saveWorkflow(
  workflow: WorkflowDefinition,
  userId: string,
): Promise<WorkflowDocument> {
  const db = await getDatabase();
  const collection = db.collection<WorkflowDocument>(WORKFLOWS_COLLECTION);

  const doc = toWorkflowDocument(workflow, userId);

  const result = await collection.updateOne(
    { id: workflow.id, userId },
    { $set: doc, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );

  if (result.upsertedId) {
    doc._id = result.upsertedId.toString();
  }

  return doc;
}

/**
 * Get a workflow by ID
 */
export async function getWorkflow(
  workflowId: string,
  userId?: string,
): Promise<WorkflowDefinition | null> {
  const db = await getDatabase();
  const collection = db.collection<WorkflowDocument>(WORKFLOWS_COLLECTION);

  const query: any = { id: workflowId, deletedAt: { $exists: false } };
  if (userId) {
    query.$or = [{ userId }, { isPublic: true }];
  }

  const doc = await collection.findOne(query);
  return doc ? fromWorkflowDocument(doc) : null;
}

/**
 * List workflows with filtering and pagination
 */
export async function listWorkflows(
  params: ListWorkflowsParams = {},
): Promise<{ workflows: WorkflowDefinition[]; total: number }> {
  const db = await getDatabase();
  const collection = db.collection<WorkflowDocument>(WORKFLOWS_COLLECTION);

  const {
    userId,
    tags,
    isPublic,
    search,
    limit = 50,
    offset = 0,
    sortBy = 'updatedAt',
    sortOrder = 'desc',
  } = params;

  // Build query
  const query: any = { deletedAt: { $exists: false } };

  if (userId) {
    query.userId = userId;
  }

  if (isPublic !== undefined) {
    query.isPublic = isPublic;
  }

  if (tags && tags.length > 0) {
    query.tags = { $in: tags };
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  // Count total
  const total = await collection.countDocuments(query);

  // Get workflows
  const docs = await collection
    .find(query)
    .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
    .skip(offset)
    .limit(limit)
    .toArray();

  const workflows = docs.map(fromWorkflowDocument);

  return { workflows, total };
}

/**
 * Delete a workflow (soft delete)
 */
export async function deleteWorkflow(
  workflowId: string,
  userId: string,
): Promise<boolean> {
  const db = await getDatabase();
  const collection = db.collection<WorkflowDocument>(WORKFLOWS_COLLECTION);

  const result = await collection.updateOne(
    { id: workflowId, userId },
    { $set: { deletedAt: new Date() } },
  );

  return result.modifiedCount > 0;
}

/**
 * Save workflow execution to MongoDB
 */
export async function saveExecution(
  execution: WorkflowExecution,
): Promise<WorkflowExecutionDocument> {
  const db = await getDatabase();
  const collection =
    db.collection<WorkflowExecutionDocument>(EXECUTIONS_COLLECTION);

  const doc: WorkflowExecutionDocument = {
    ...execution,
    createdAt: new Date(),
  };

  const result = await collection.insertOne(doc as any);
  doc._id = result.insertedId.toString();

  // Also update the workflow's executions array
  const workflowsCollection =
    db.collection<WorkflowDocument>(WORKFLOWS_COLLECTION);
  await workflowsCollection.updateOne(
    { id: execution.workflowId },
    { $push: { executions: doc._id } as any },
  );

  return doc;
}

/**
 * Get workflow executions
 */
export async function getExecutions(
  workflowId: string,
  limit: number = 20,
): Promise<WorkflowExecution[]> {
  const db = await getDatabase();
  const collection =
    db.collection<WorkflowExecutionDocument>(EXECUTIONS_COLLECTION);

  const docs = await collection
    .find({ workflowId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map(doc => {
    const { _id, createdAt, ...execution } = doc;
    return {
      ...execution,
      id: _id?.toString() || `exec-${Date.now()}`,
    } as WorkflowExecution;
  });
}

/**
 * Get a single execution by ID
 */
export async function getExecution(
  executionId: string,
): Promise<WorkflowExecution | null> {
  const db = await getDatabase();
  const collection =
    db.collection<WorkflowExecutionDocument>(EXECUTIONS_COLLECTION);

  const doc = await collection.findOne({ id: executionId } as any);
  if (!doc) return null;

  const { _id, createdAt, ...execution } = doc;
  return {
    ...execution,
    id: _id?.toString() || executionId,
  } as WorkflowExecution;
}

/**
 * Update workflow metadata (name, description, tags)
 */
export async function updateWorkflowMetadata(
  workflowId: string,
  userId: string,
  metadata: Partial<Pick<WorkflowDefinition, 'name' | 'description' | 'tags' | 'isPublic'>>,
): Promise<boolean> {
  const db = await getDatabase();
  const collection = db.collection<WorkflowDocument>(WORKFLOWS_COLLECTION);

  const result = await collection.updateOne(
    { id: workflowId, userId },
    { $set: { ...metadata, updatedAt: new Date() } },
  );

  return result.modifiedCount > 0;
}

