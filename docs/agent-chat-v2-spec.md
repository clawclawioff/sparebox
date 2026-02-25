# Agent Chat V2: Direct HTTP Gateway Architecture

**Author:** Claude (Subagent)  
**Date:** 2026-02-24  
**Status:** Implementation in progress  

## Executive Summary

Replace the slow, fragile heartbeat-polling message relay with direct HTTP calls to the OpenClaw gateway running inside each agent's Docker container. This reduces message latency from 60-120s to near-instant responses.

---

## Problem Statement

### Current Architecture (Broken)

```
User sends message → DB (pending)
       ↓ wait 60s
Daemon heartbeat picks up message
       ↓
Daemon runs: docker exec openclaw agent --message "..."
       ↓ (often fails)
Response queued in daemon
       ↓ wait 60s
Next heartbeat sends response to backend
       ↓
Backend stores in agent_messages
       ↓
Frontend polls and displays
```

**Issues:**
- 60-120s latency minimum (2 heartbeat cycles)
- `docker exec openclaw agent --message` is fragile:
  - CLI output parsing breaks with model/version changes
  - JSON parsing errors
  - Timeout handling issues
- No streaming support
- Single point of failure (daemon heartbeat)

---

## New Architecture

### Direct HTTP to Container Gateway

```
User sends message → Backend API
       ↓ immediate
Backend makes HTTP POST to container:
  http://<host-ip>:<container-port>/v1/chat/completions
       ↓ streaming
Response stored in agent_messages
       ↓
Frontend receives response (SSE or poll)
```

**Benefits:**
- Near-instant responses (seconds, not minutes)
- Streaming support via SSE
- Standard OpenAI-compatible API
- No CLI parsing fragility
- Works with any OpenClaw version

---

## Technical Design

### 1. OpenClaw Gateway HTTP API

The OpenClaw container already runs a gateway on port 3000. It has a built-in OpenAI-compatible Chat Completions API that needs to be enabled via config:

```json5
{
  "gateway": {
    "auth": {
      "mode": "token",
      "token": "<generated-token>"
    },
    "http": {
      "endpoints": {
        "chatCompletions": {
          "enabled": true
        }
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-6"  // or openai/gpt-4o-mini
      }
    }
  }
}
```

**API Endpoint:** `POST /v1/chat/completions`

**Request:**
```json
{
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "stream": true
}
```

**Response (streamed):**
```
data: {"choices":[{"delta":{"content":"Hi"}}]}
data: {"choices":[{"delta":{"content":" there"}}]}
data: {"choices":[{"delta":{"content":"!"}}]}
data: [DONE]
```

---

### 2. Database Schema Changes

Add to `agents` table:

```sql
ALTER TABLE agents ADD COLUMN gateway_token TEXT;
ALTER TABLE agents ADD COLUMN container_port INTEGER;
```

- `gateway_token`: Encrypted per-agent auth token (same encryption as `encrypted_api_key`)
- `container_port`: The host port mapped to container's port 3000

The `hosts` table already has `tailscaleIp` and `publicIp` for reaching remote hosts.

---

### 3. Deploy Config Changes

**File:** `src/app/api/agents/[id]/deploy-config/route.ts`

Generate and return:
- `gatewayToken`: Random 32-byte hex token
- `containerPort`: Allocated port (daemon decides, but we track it)
- `openclawConfig`: Full config blob with HTTP API enabled

```typescript
// Generate gateway token at deploy time
const gatewayToken = crypto.randomBytes(32).toString('hex');

// Store encrypted in DB
await db.update(agents).set({
  gatewayToken: encrypt(gatewayToken),
}).where(eq(agents.id, agentId));

// Return in config bundle
const configBundle = {
  // ... existing fields ...
  gatewayToken,
  openclawConfig: {
    gateway: {
      auth: { mode: 'token', token: gatewayToken },
      http: { endpoints: { chatCompletions: { enabled: true } } }
    },
    agents: {
      defaults: {
        model: { primary: determineModel(agent) }
      }
    }
  }
};
```

**Model Selection Logic:**
```typescript
function determineModel(agent: Agent, env: Record<string, string>): string {
  // Check explicit config
  if (agent.config?.model) return agent.config.model;
  
  // Infer from provider
  if (env.OPENCLAW_PROVIDER === 'openai') return 'openai/gpt-4o-mini';
  return 'anthropic/claude-sonnet-4-6';
}
```

---

### 4. Daemon Changes

**Files:** `daemon/bundle.cjs`, `public/sparebox-daemon.cjs`

#### Remove Message Relay Code

Delete these functions and related code:
- `handleDockerMessage()`
- `handleProfileMessage()`
- `parseAgentResponse()`
- `pendingResponses` array
- `drainMessageResponses()`
- `queueMessageResponses()`
- `processMessages()`

Remove from heartbeat payload:
- `messageResponses` field

Remove message handling from heartbeat response processing.

#### Update Deploy Handler

When deploying, write `openclaw.json` to the container's state directory:

```javascript
async function handleDeploy(cmd) {
  // ... existing setup ...
  
  // Write OpenClaw config with HTTP API enabled
  const openclawConfig = {
    gateway: {
      auth: { mode: 'token', token: configData.gatewayToken },
      http: { endpoints: { chatCompletions: { enabled: true } } }
    },
    agents: {
      defaults: {
        model: { primary: configData.openclawConfig?.agents?.defaults?.model?.primary || 'anthropic/claude-sonnet-4-6' }
      }
    }
  };
  
  fs.writeFileSync(
    path.join(stateDir, 'openclaw.json'),
    JSON.stringify(openclawConfig, null, 2),
    'utf-8'
  );
  
  // ... rest of deploy ...
}
```

#### Container Creation

The container already mounts `/state` which maps to the agent's state directory. The OpenClaw image reads config from `/state/openclaw.json` if present.

Update `createContainer()` to track the allocated port:

```javascript
async function createContainer(opts) {
  // ... existing code ...
  
  // Container created with -p ${opts.port}:3000
  // Port is already tracked in agent record
}
```

#### Report Port in Agent Status

Include port in `agentStatuses` reported during heartbeat:

```javascript
async function getAgentStatuses() {
  // ... existing code ...
  statuses.push({
    agentId,
    containerId: agent.containerId,
    status,
    // ... existing stats ...
    port: agent.port  // Already included
  });
}
```

---

### 5. New Chat API Route

**File:** `src/app/api/agents/[id]/chat/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/db';
import { agents, agentMessages, hosts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { decrypt } from '@/lib/encryption';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: agentId } = await params;
  
  // 1. Auth
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // 2. Fetch agent with host
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentId),
    with: { host: true }
  });
  
  if (!agent || agent.userId !== session.user.id) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }
  
  if (agent.status !== 'running') {
    return NextResponse.json({ error: 'Agent is not running' }, { status: 400 });
  }
  
  if (!agent.gatewayToken || !agent.containerPort) {
    return NextResponse.json({ error: 'Agent not configured for chat' }, { status: 400 });
  }
  
  // 3. Parse request
  const { content, stream = false } = await req.json();
  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'Missing content' }, { status: 400 });
  }
  
  // 4. Store user message
  const [userMessage] = await db.insert(agentMessages).values({
    agentId,
    role: 'user',
    content,
    status: 'pending'
  }).returning();
  
  // 5. Build container URL
  const host = agent.host;
  const hostIp = host?.tailscaleIp || host?.publicIp || '127.0.0.1';
  const containerUrl = `http://${hostIp}:${agent.containerPort}/v1/chat/completions`;
  
  // 6. Decrypt gateway token
  const gatewayToken = decrypt(agent.gatewayToken);
  
  // 7. Make request to container
  try {
    const response = await fetch(containerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${gatewayToken}`
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content }],
        stream: false  // Start with non-streaming
      }),
      signal: AbortSignal.timeout(120_000)  // 2 min timeout
    });
    
    if (!response.ok) {
      throw new Error(`Gateway error: ${response.status}`);
    }
    
    const data = await response.json();
    const assistantContent = data.choices?.[0]?.message?.content || '[No response]';
    
    // 8. Store agent response
    await db.update(agentMessages)
      .set({ status: 'responded', respondedAt: new Date() })
      .where(eq(agentMessages.id, userMessage.id));
    
    const [agentResponse] = await db.insert(agentMessages).values({
      agentId,
      role: 'agent',
      content: assistantContent,
      status: 'responded',
      respondedAt: new Date()
    }).returning();
    
    return NextResponse.json({
      userMessage,
      agentResponse
    });
    
  } catch (err) {
    // Mark message as failed
    await db.update(agentMessages)
      .set({ status: 'failed' })
      .where(eq(agentMessages.id, userMessage.id));
    
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
```

---

### 6. Heartbeat Changes

**File:** `src/app/api/hosts/heartbeat/route.ts`

Remove:
- `messageResponses` from schema validation
- Message response processing (section 9b)
- Pending message fetching (section 10b)
- `messages` from response payload

Keep:
- All metric collection
- Command handling
- Agent status updates
- Rate limiting

Update heartbeat schema:
```typescript
const heartbeatSchema = z.object({
  // ... existing fields ...
  // REMOVE: messageResponses
  agentStatuses: z.array(z.object({
    // ... existing fields ...
    port: z.number().int().positive().optional()  // Track container port
  })).default([])
});
```

Store container port from agent status:
```typescript
// In agent status processing
if (agentStatus.port) {
  await db.update(agents)
    .set({ containerPort: agentStatus.port })
    .where(eq(agents.id, agentStatus.agentId));
}
```

---

### 7. Frontend Changes

**File:** `src/app/dashboard/agents/[id]/page.tsx`

Update `AgentChat` component:

```typescript
// Replace messages.send mutation with direct fetch
const sendChatMessage = async (content: string) => {
  setIsSending(true);
  try {
    const response = await fetch(`/api/agents/${agentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to send message');
    }
    
    // Response includes both messages, refetch to update UI
    await refetchMessages();
  } catch (err) {
    // Handle error
  } finally {
    setIsSending(false);
  }
};
```

Update UI text:
- Remove "Responses may take up to 60s" 
- Show proper loading state during API call
- Remove message status indicators (pending/delivered) - now instant

---

## Migration Plan

### Phase 1: Database (Non-breaking)
1. Create migration adding `gateway_token` and `container_port` columns
2. Deploy migration

### Phase 2: Backend Updates (Non-breaking)
1. Update deploy-config to generate gateway token
2. Update heartbeat to store container port
3. Create new `/api/agents/[id]/chat` route
4. Deploy backend

### Phase 3: Daemon Update (Breaking for messages)
1. Update daemon to write `openclaw.json` on deploy
2. Remove message relay code from daemon
3. Update both `daemon/bundle.cjs` and `public/sparebox-daemon.cjs`
4. Release new daemon version
5. Hosts auto-update on next restart

### Phase 4: Frontend Update
1. Switch chat component to use new API
2. Remove legacy status indicators
3. Deploy frontend

### Phase 5: Cleanup
1. Remove message polling from heartbeat
2. Remove legacy message router (keep for history viewing)
3. Clean up unused code

---

## Security Considerations

1. **Gateway tokens are per-agent** - compromise of one token doesn't affect others
2. **Tokens encrypted at rest** - same AES-256-GCM as API keys
3. **Backend-only access** - users never see gateway tokens or container URLs
4. **Network isolation** - containers on Docker bridge, not directly exposed
5. **Remote hosts** - traffic via Tailscale (encrypted) or proxy through daemon

---

## Future Enhancements

1. **Streaming responses** - Add SSE support to chat route for real-time token delivery
2. **Daemon proxy** - For hosts without Tailscale, daemon acts as HTTP proxy
3. **Conversation context** - Pass previous messages to maintain context
4. **Rate limiting** - Per-agent rate limits on chat endpoint

---

## Files Changed

### New Files
- `src/app/api/agents/[id]/chat/route.ts`
- `drizzle/migrations/XXXX_add_gateway_columns.sql`

### Modified Files
- `src/db/schema.ts` - Add columns
- `src/app/api/agents/[id]/deploy-config/route.ts` - Generate token, return config
- `src/app/api/hosts/heartbeat/route.ts` - Remove message handling, store port
- `daemon/bundle.cjs` - Remove message relay, write openclaw.json
- `public/sparebox-daemon.cjs` - Same as bundle.cjs
- `src/app/dashboard/agents/[id]/page.tsx` - Use new chat API

### Removed Code
- Message relay in daemon (`handleDockerMessage`, `handleProfileMessage`, etc.)
- Message polling in heartbeat route (sections 9b, 10b)
- `messageResponses` from heartbeat schema

---

## Testing Checklist

- [ ] DB migration runs without errors
- [ ] Deploy-config returns gateway token and openclawConfig
- [ ] Daemon writes openclaw.json on deploy
- [ ] Container starts with HTTP API enabled
- [ ] Chat API can reach container and get response
- [ ] Messages stored correctly in agent_messages
- [ ] Frontend displays conversation correctly
- [ ] Error handling works (agent stopped, timeout, etc.)
- [ ] Existing agents can be migrated (redeploy to get token)
