# Agent Workflow Builder Guide

## Overview

The Agent Workflow Builder is a visual tool for creating, managing, and executing agent workflows. It allows you to chain multiple AI agents together by connecting nodes in a flow diagram.

## Getting Started

### Accessing the Workflow Builder

1. Click on **"Workflows"** in the sidebar
2. Click **"New Workflow"** to create a new workflow
3. Or click on an existing workflow to edit it

## Core Concepts

### Nodes

Nodes are the building blocks of your workflow. There are several types:

#### 1. Input Node 📥
- **Purpose**: Define the starting point of your workflow
- **Usage**: Add input fields that users can fill in
- **Configuration**: Add/remove fields, set types (text, number, array, media)

#### 2. Agent Node 🤖
- **Purpose**: Execute AI agents from your system
- **Usage**: Automatically discovered from `aiRouterRegistry`
- **Configuration**: Set default values for agent inputs
- **Examples**: Research Agent, Summarize Agent, Video Generator

#### 3. Transform Node 🔄
- **Purpose**: Transform data between agents
- **Usage**: Write JavaScript expressions to modify data
- **Example**: `input => input.toUpperCase()`

#### 4. Output Node 📤
- **Purpose**: Collect final results from your workflow
- **Usage**: Automatically displays connected data

#### 5. Advanced Nodes
- **Conditional**: Branch workflow based on conditions
- **Loop**: Iterate over arrays
- **Merge**: Combine multiple inputs
- **Delay**: Add pauses between operations

### Connections

Connect nodes by dragging from an **output handle** (right side) to an **input handle** (left side).

- **Type Checking**: Connections are validated based on data types
- **Visual Feedback**: Invalid connections show in red
- **Handles**: Each handle represents a field from the agent's schema

### Variables

Variables allow you to store and reuse values across your workflow:

1. Click **"Add Variable"** in the bottom panel
2. Define name, type, and value
3. Reference in nodes using `{{variableName}}` syntax

**Example**: 
```
Variable: apiKey = "abc123"
Use in node: {{apiKey}}
```

## Creating Your First Workflow

### Example: Research → Summarize

1. **Add Input Node**
   - Add a field called "query" (type: text)
   - Set value to "AI trends 2024"

2. **Add Research Agent**
   - Select "Brave Research" from the node library
   - Connect Input node's "query" to Research agent's "query"

3. **Add Summarize Agent**
   - Select "Summarises Research" from the library
   - Connect Research agent output to Summarize input

4. **Add Output Node**
   - Connect Summarize output to Output node

5. **Execute**
   - Click the **"Execute"** button
   - Watch nodes light up as they execute
   - View results in the Output node

## Features

### Auto-Save
- Drafts are automatically saved to IndexedDB every 2 seconds
- No data loss if browser closes

### Execution
- Real-time visual feedback during execution
- See node status (running, success, error)
- View results for each node

### Validation
- Automatic type checking
- Circular dependency detection
- Visual error indicators

### Storage
- **IndexedDB**: Draft workflows (local)
- **MongoDB**: Production workflows (persistent)

## Keyboard Shortcuts

- **Delete**: Remove selected node
- **Ctrl+S**: Save workflow (coming soon)
- **Ctrl+E**: Execute workflow (coming soon)

## Best Practices

1. **Start Simple**: Begin with 2-3 nodes, then expand
2. **Use Variables**: Store reusable values as variables
3. **Test Incrementally**: Execute after adding each node
4. **Name Clearly**: Give your workflow a descriptive name
5. **Handle Errors**: Add conditional nodes to handle failures

## Troubleshooting

### Connection Won't Connect
- Check if data types are compatible
- Ensure no circular dependencies
- Try connecting to a different handle

### Node Won't Execute
- Verify all required inputs are connected
- Check for validation errors (bottom right)
- Ensure previous nodes completed successfully

### Agent Not Found
- Check that agent is registered in `aiRouterRegistry`
- Verify agent has `actAsTool` configuration
- Ensure `hideUI` is not set to true

## Advanced Usage

### Custom Transforms
Use JavaScript to transform data:
```javascript
// Convert string to uppercase
input => input.toUpperCase()

// Filter array
input => input.filter(item => item.score > 0.5)

// Map array
input => input.map(item => ({ ...item, processed: true }))
```

### Conditional Branching
1. Add Conditional node
2. Set condition: `input.status === "success"`
3. Connect to different paths based on true/false

### Loops
1. Add Loop node
2. Connect array input
3. Add nodes inside loop (one iteration per item)
4. Collect results from "result" output

## API Integration

Workflows can be executed programmatically:

```typescript
// Execute a workflow
const response = await fetch(`/api/workflows/${workflowId}/execute`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-id',
    variables: { query: 'test' }
  })
});
```

## Tips & Tricks

- **Duplicate Workflows**: Save a copy before making major changes
- **Use Tags**: Organize workflows with tags
- **Share Workflows**: Set `isPublic: true` to share with team
- **Version Control**: Export workflow JSON for backup
- **Test with Sample Data**: Use Input nodes to test with known data

## Support

For issues or questions:
1. Check validation errors in the UI
2. Review console logs for detailed errors
3. Verify agent schemas are correct
4. Test agents individually before adding to workflow

