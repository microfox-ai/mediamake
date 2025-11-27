// Node type registry for React Flow
import { AgentNode } from './nodes/AgentNode';
import { InputNode } from './nodes/InputNode';
import { OutputNode } from './nodes/OutputNode';
import { TransformNode } from './nodes/TransformNode';
import { ConditionalNode } from './nodes/ConditionalNode';
import { LoopNode } from './nodes/LoopNode';
import { MergeNode } from './nodes/MergeNode';
import { DelayNode } from './nodes/DelayNode';

export const nodeTypes = {
  agent: AgentNode,
  input: InputNode,
  output: OutputNode,
  transform: TransformNode,
  conditional: ConditionalNode,
  loop: LoopNode,
  merge: MergeNode,
  delay: DelayNode,
};

