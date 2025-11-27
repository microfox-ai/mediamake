# Chrome Extension Integration Guide

## Overview

This guide explains how to call MediaMake AI agents from a Chrome extension. The system provides REST API endpoints for agent discovery and execution.

## Table of Contents

1. [Quick Start](#quick-start)
2. [API Endpoints](#api-endpoints)
3. [Agent Discovery](#agent-discovery)
4. [Calling Agents](#calling-agents)
5. [Authentication](#authentication)
6. [Complete Examples](#complete-examples)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

---

## Quick Start

### 1. Discover Available Agents

First, get a list of all available agents:

```javascript
// In your Chrome extension background script or content script
const API_BASE_URL = 'http://localhost:3000'; // Replace with your server URL

async function getAvailableAgents() {
  const response = await fetch(`${API_BASE_URL}/api/agents`);
  const data = await response.json();
  return data.agents;
}

// Usage
const agents = await getAvailableAgents();
console.log('Available agents:', agents);
```

### 2. Call an Agent

Once you know which agent to use, call it with the appropriate parameters:

```javascript
async function callAgent(agentPath, params, messages = []) {
  const response = await fetch(
    `${API_BASE_URL}/api/studio/chat/agent${agentPath}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        ...params,
      }),
    },
  );

  return response;
}

// Example: Call the summarize agent
const result = await callAgent('/summarize', {
  text: 'Your long text here...',
});
```

---

## API Endpoints

### 1. List All Agents

**Endpoint:** `GET /api/agents`

**Description:** Returns a list of all available AI agents with their metadata.

**Query Parameters:**

- `tag` (optional): Filter agents by tag
- `category` (optional): Filter agents by category

**Response:**

```json
{
  "success": true,
  "agents": [
    {
      "id": "summarizeResearch",
      "name": "Summarize Research",
      "path": "/summarize",
      "description": "Summarize research content",
      "inputSchema": { ... },
      "outputSchema": { ... },
      "metadata": {
        "tags": ["summary", "research"],
        "category": "content",
        "icon": "📝",
        "hideUI": false,
        "title": "Summarize Research"
      }
    }
  ],
  "count": 15,
  "filters": {
    "tag": null,
    "category": null
  }
}
```

### 2. Get Agent Details

**Endpoint:** `GET /api/agents/{agentId}`

**Description:** Returns detailed information about a specific agent.

**Response:**

```json
{
  "success": true,
  "agent": {
    "id": "summarizeResearch",
    "name": "Summarize Research",
    "path": "/summarize",
    "description": "Summarize research content",
    "inputSchema": { ... },
    "outputSchema": { ... },
    "metadata": { ... }
  }
}
```

### 3. Execute Agent (POST)

**Endpoint:** `POST /api/studio/chat/agent/{agentPath}`

**Description:** Execute an agent with the provided parameters and messages.

**Request Body:**

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Your message here"
    }
  ],
  "param1": "value1",
  "param2": "value2"
}
```

**Note:** Parameters vary by agent. Check the agent's `inputSchema` for required parameters.

### 4. Execute Agent (GET)

**Endpoint:** `GET /api/studio/chat/agent/{agentPath}?param1=value1&param2=value2`

**Description:** Execute an agent with query parameters (for simple requests).

---

## Agent Discovery

### Filtering Agents

You can filter agents by tags or categories:

```javascript
// Get all transcription-related agents
async function getTranscriptionAgents() {
  const response = await fetch(`${API_BASE_URL}/api/agents?tag=transcription`);
  const data = await response.json();
  return data.agents;
}

// Get all analysis agents
async function getAnalysisAgents() {
  const response = await fetch(`${API_BASE_URL}/api/agents?category=analysis`);
  const data = await response.json();
  return data.agents;
}
```

### Building a Dynamic UI

Use the agent metadata to build a user-friendly selection interface:

```javascript
async function buildAgentSelector() {
  const agents = await getAvailableAgents();

  const selector = document.createElement('select');
  selector.id = 'agent-selector';

  agents.forEach(agent => {
    const option = document.createElement('option');
    option.value = agent.path;
    option.textContent = `${agent.metadata.icon} ${agent.name}`;
    option.dataset.description = agent.description;
    selector.appendChild(option);
  });

  return selector;
}
```

---

## Calling Agents

### Available Agents

Here are some key agents you can use:

#### 1. Research Agent

- **Path:** `/research`
- **Purpose:** Perform web research using Brave Search
- **Example:**

```javascript
const result = await callAgent('/research', {
  query: 'AI advancements in 2024',
  deep: true,
  count: 10,
});
```

#### 2. Summarize Agent

- **Path:** `/summarize`
- **Purpose:** Summarize long-form content
- **Example:**

```javascript
const result = await callAgent('/summarize', {
  text: 'Long article text...',
});
```

#### 3. YouTube Metadata Agent

- **Path:** `/youtube-metadata`
- **Purpose:** Generate metadata for YouTube videos
- **Example:**

```javascript
const result = await callAgent('/youtube-metadata', {
  videoTitle: 'My Video',
  transcript: 'Video transcript...',
});
```

#### 4. Transcription Fixer Agent

- **Path:** `/transcription-fixer`
- **Purpose:** Fix and optimize transcriptions
- **Example:**

```javascript
const result = await callAgent('/transcription-fixer', {
  transcriptionId: 'abc123',
  fixTypes: ['spelling', 'punctuation'],
});
```

#### 5. Audio Analysis Agent

- **Path:** `/audio-analysis`
- **Purpose:** Analyze audio content
- **Example:**

```javascript
const result = await callAgent('/audio-analysis', {
  audioUrl: 'https://example.com/audio.mp3',
});
```

#### 6. Concept Generation Agent

- **Path:** `/concept-generation`
- **Purpose:** Generate creative concepts
- **Example:**

```javascript
const result = await callAgent('/concept-generation', {
  topic: 'Sustainable living',
  style: 'modern',
});
```

#### 7. Midjourney Prompting Agent

- **Path:** `/midjourney-prompting`
- **Purpose:** Generate optimized Midjourney prompts
- **Example:**

```javascript
const result = await callAgent('/midjourney-prompting', {
  description: 'A futuristic city at sunset',
});
```

---

## Authentication

### Using API Keys (Recommended for Extensions)

If your server requires authentication, include the API key in the request headers:

```javascript
async function callAgentWithAuth(agentPath, params, apiKey) {
  const response = await fetch(
    `${API_BASE_URL}/api/studio/chat/agent${agentPath}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        // Or use a custom header
        'X-API-Key': apiKey,
      },
      body: JSON.stringify(params),
    },
  );

  return response;
}
```

### Storing API Keys Securely

Store API keys in Chrome's storage API:

```javascript
// Save API key
chrome.storage.sync.set({ apiKey: 'your-api-key' });

// Retrieve API key
chrome.storage.sync.get(['apiKey'], result => {
  const apiKey = result.apiKey;
  // Use the API key
});
```

---

## Complete Examples

### Example 1: Simple Extension Popup

**manifest.json:**

```json
{
  "manifest_version": 3,
  "name": "MediaMake AI Assistant",
  "version": "1.0",
  "permissions": ["storage"],
  "host_permissions": ["http://localhost:3000/*"],
  "action": {
    "default_popup": "popup.html"
  }
}
```

**popup.html:**

```html
<!DOCTYPE html>
<html>
  <head>
    <title>MediaMake AI</title>
    <style>
      body {
        width: 400px;
        padding: 20px;
        font-family: Arial;
      }
      select,
      button,
      textarea {
        width: 100%;
        margin: 10px 0;
        padding: 10px;
      }
      textarea {
        height: 100px;
      }
      #result {
        background: #f5f5f5;
        padding: 10px;
        margin-top: 10px;
      }
    </style>
  </head>
  <body>
    <h2>🤖 MediaMake AI Agents</h2>

    <select id="agent-selector">
      <option value="">Loading agents...</option>
    </select>

    <div id="agent-description"></div>

    <textarea id="input" placeholder="Enter your input..."></textarea>

    <button id="execute">Execute Agent</button>

    <div id="result"></div>

    <script src="popup.js"></script>
  </body>
</html>
```

**popup.js:**

```javascript
const API_BASE_URL = 'http://localhost:3000';

// Load agents on startup
document.addEventListener('DOMContentLoaded', async () => {
  await loadAgents();

  // Handle agent selection
  document.getElementById('agent-selector').addEventListener('change', e => {
    const option = e.target.selectedOptions[0];
    document.getElementById('agent-description').textContent =
      option.dataset.description || '';
  });

  // Handle execution
  document.getElementById('execute').addEventListener('click', executeAgent);
});

async function loadAgents() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/agents`);
    const data = await response.json();

    const selector = document.getElementById('agent-selector');
    selector.innerHTML = '';

    data.agents.forEach(agent => {
      const option = document.createElement('option');
      option.value = agent.path;
      option.textContent = `${agent.metadata.icon} ${agent.name}`;
      option.dataset.description = agent.description;
      selector.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading agents:', error);
    alert('Failed to load agents. Make sure the server is running.');
  }
}

async function executeAgent() {
  const agentPath = document.getElementById('agent-selector').value;
  const input = document.getElementById('input').value;
  const resultDiv = document.getElementById('result');

  if (!agentPath || !input) {
    alert('Please select an agent and enter input');
    return;
  }

  resultDiv.textContent = 'Processing...';

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/studio/chat/agent${agentPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: input,
            },
          ],
        }),
      },
    );

    // Handle streaming response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      result += decoder.decode(value, { stream: true });
      resultDiv.textContent = result;
    }
  } catch (error) {
    console.error('Error executing agent:', error);
    resultDiv.textContent = `Error: ${error.message}`;
  }
}
```

### Example 2: Content Script Integration

Inject AI capabilities into web pages:

**manifest.json:**

```json
{
  "manifest_version": 3,
  "name": "Page AI Assistant",
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ],
  "host_permissions": ["http://localhost:3000/*"]
}
```

**content.js:**

```javascript
const API_BASE_URL = 'http://localhost:3000';

// Add a floating button to summarize the page
const button = document.createElement('button');
button.textContent = '🤖 Summarize Page';
button.style.cssText = `
  position: fixed;
  bottom: 20px;
  right: 20px;
  z-index: 10000;
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 14px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
`;

button.addEventListener('click', async () => {
  // Get page content
  const pageText = document.body.innerText;

  button.textContent = '⏳ Processing...';
  button.disabled = true;

  try {
    // Call summarize agent
    const response = await fetch(
      `${API_BASE_URL}/api/studio/chat/agent/summarize`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Summarize this webpage content:\n\n${pageText.substring(0, 5000)}`,
            },
          ],
        }),
      },
    );

    // Show result in an overlay
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let summary = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      summary += decoder.decode(value, { stream: true });
    }

    showSummaryOverlay(summary);
  } catch (error) {
    alert(`Error: ${error.message}`);
  } finally {
    button.textContent = '🤖 Summarize Page';
    button.disabled = false;
  }
});

document.body.appendChild(button);

function showSummaryOverlay(summary) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 5px 20px rgba(0,0,0,0.3);
    max-width: 600px;
    max-height: 80vh;
    overflow-y: auto;
    z-index: 10001;
  `;

  overlay.innerHTML = `
    <h2>📝 Page Summary</h2>
    <div style="white-space: pre-wrap;">${summary}</div>
    <button id="close-summary" style="margin-top: 20px; padding: 10px 20px;">Close</button>
  `;

  document.body.appendChild(overlay);

  document.getElementById('close-summary').addEventListener('click', () => {
    overlay.remove();
  });
}
```

### Example 3: Background Service Worker with Message Passing

For more complex extensions, use a service worker:

**manifest.json:**

```json
{
  "manifest_version": 3,
  "name": "AI Service Worker",
  "background": {
    "service_worker": "background.js"
  },
  "permissions": ["storage"],
  "host_permissions": ["http://localhost:3000/*"]
}
```

**background.js:**

```javascript
const API_BASE_URL = 'http://localhost:3000';

// Cache agents list
let cachedAgents = null;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getAgents') {
    getAgents().then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (request.action === 'callAgent') {
    callAgent(request.path, request.params).then(sendResponse);
    return true;
  }
});

async function getAgents() {
  if (cachedAgents) {
    return { success: true, agents: cachedAgents };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/api/agents`);
    const data = await response.json();
    cachedAgents = data.agents;
    return data;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function callAgent(agentPath, params) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/studio/chat/agent${agentPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      },
    );

    // Read the full response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let result = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      result += decoder.decode(value, { stream: true });
    }

    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
```

**popup.js (using the service worker):**

```javascript
// Get agents from background service
chrome.runtime.sendMessage({ action: 'getAgents' }, response => {
  if (response.success) {
    displayAgents(response.agents);
  }
});

// Call an agent
chrome.runtime.sendMessage(
  {
    action: 'callAgent',
    path: '/summarize',
    params: {
      messages: [{ role: 'user', content: 'Hello' }],
    },
  },
  response => {
    if (response.success) {
      console.log('Result:', response.result);
    }
  },
);
```

---

## Error Handling

### Common Error Responses

```javascript
async function callAgentWithErrorHandling(agentPath, params) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/studio/chat/agent${agentPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Unknown error');
    }

    return response;
  } catch (error) {
    console.error('Agent call failed:', error);

    // Handle specific error types
    if (error.message.includes('not found')) {
      alert('Agent not found. Please check the agent path.');
    } else if (error.message.includes('timeout')) {
      alert('Request timed out. Please try again.');
    } else {
      alert(`Error: ${error.message}`);
    }

    throw error;
  }
}
```

---

## Best Practices

### 1. Cache Agent List

Don't fetch the agent list on every request. Cache it:

```javascript
let agentCache = null;
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getAgentsWithCache() {
  const now = Date.now();

  if (agentCache && now < cacheExpiry) {
    return agentCache;
  }

  const response = await fetch(`${API_BASE_URL}/api/agents`);
  const data = await response.json();

  agentCache = data.agents;
  cacheExpiry = now + CACHE_DURATION;

  return agentCache;
}
```

### 2. Handle Streaming Responses

Many agents return streaming responses. Handle them properly:

```javascript
async function handleStreamingResponse(response) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    // Process chunk (e.g., update UI)
    console.log('Received chunk:', chunk);
  }
}
```

### 3. Implement Retry Logic

Add retry logic for failed requests:

```javascript
async function callAgentWithRetry(agentPath, params, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callAgent(agentPath, params);
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

### 4. Validate Input

Validate input before sending to agents:

```javascript
function validateAgentInput(agent, input) {
  const schema = agent.inputSchema;

  if (!schema) return true;

  // Basic validation based on schema
  // You can use a library like Zod for more robust validation
  const required = schema.required || [];

  for (const field of required) {
    if (!input[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  return true;
}
```

### 5. Monitor Performance

Track agent performance:

```javascript
async function callAgentWithMetrics(agentPath, params) {
  const startTime = performance.now();

  try {
    const result = await callAgent(agentPath, params);
    const duration = performance.now() - startTime;

    console.log(`Agent ${agentPath} completed in ${duration}ms`);

    // Send metrics to analytics
    chrome.storage.local.get(['metrics'], data => {
      const metrics = data.metrics || [];
      metrics.push({
        agent: agentPath,
        duration,
        timestamp: Date.now(),
      });
      chrome.storage.local.set({ metrics });
    });

    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`Agent ${agentPath} failed after ${duration}ms:`, error);
    throw error;
  }
}
```

---

## CORS Configuration

If you encounter CORS issues, you may need to configure your server. Add this to your Next.js API routes:

```typescript
// In your API route file
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

Or use a Next.js middleware to handle CORS globally.

---

## Troubleshooting

### Issue: "Failed to fetch"

- **Cause:** Server not running or wrong URL
- **Solution:** Verify server is running at the specified URL

### Issue: "CORS policy error"

- **Cause:** Chrome extension blocked by CORS
- **Solution:** Add server URL to `host_permissions` in manifest.json

### Issue: "Agent not found"

- **Cause:** Invalid agent path
- **Solution:** Use `/api/agents` to get valid agent paths

### Issue: "Timeout"

- **Cause:** Agent taking too long to respond
- **Solution:** Implement timeout handling and retry logic

---

## Next Steps

1. **Explore agent schemas:** Use `/api/agents/{agentId}` to see detailed input/output schemas
2. **Test with Postman:** Test API calls before implementing in extension
3. **Read agent documentation:** Check individual agent docs for specific usage
4. **Join the community:** Share your extensions and get help

---

## Support

For more information:

- API Documentation: `/docs/api-reference`
- Agent Documentation: `/docs/ai-router`
- GitHub Issues: [Your repo URL]

Happy building! 🚀
