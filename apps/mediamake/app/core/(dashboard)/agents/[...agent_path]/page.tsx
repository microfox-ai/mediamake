import React from "react";
import { AgentPageClient } from "@/components/agents/individual/agent-page-client";

interface AgentPageProps {
    params: Promise<{
        agent_path: string | string[];
    }>;
}

export default async function AgentPage({ params }: AgentPageProps) {
    const { agent_path } = await params;
    const agentPath = Array.isArray(agent_path)
        ? agent_path.join('/')
        : agent_path;
    return <AgentPageClient agentPath={agentPath} />;
}
