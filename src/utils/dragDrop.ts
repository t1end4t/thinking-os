import { DragEvent } from 'react';
import { WorkspaceObject, WorkspaceObjectType } from '../productivityTypes';

export const WORKSPACE_OBJECT_MIME = 'application/x-productivity-os-object';

export function setDragObjectData(e: DragEvent, object: WorkspaceObject) {
  const json = JSON.stringify(object);
  const assistantContext = JSON.stringify({
    type: object.objectType,
    id: object.id,
    label: object.title,
    secondaryLabel: object.subtitle,
    metadata: object.meta
  });
  e.dataTransfer.setData(WORKSPACE_OBJECT_MIME, json);
  e.dataTransfer.setData('application/json', assistantContext);
  e.dataTransfer.setData('text/plain', `[${object.objectType.toUpperCase()}: ${object.title}] ${object.subtitle || ''} ${object.details || ''}`);
  e.dataTransfer.effectAllowed = 'copyMove';
}

export function parseDroppedWorkspaceObject(e: DragEvent): WorkspaceObject | null {
  try {
    const customData = e.dataTransfer.getData(WORKSPACE_OBJECT_MIME);
    if (customData) {
      return JSON.parse(customData) as WorkspaceObject;
    }

    const jsonData = e.dataTransfer.getData('application/json');
    if (jsonData) {
      const parsed = JSON.parse(jsonData);
      if (parsed && parsed.objectType && parsed.id) {
        return parsed as WorkspaceObject;
      }
    }

    const textData = e.dataTransfer.getData('text/plain');
    if (textData && textData.startsWith('task-')) {
      return {
        objectType: 'task',
        id: textData,
        title: `Task #${textData}`
      };
    }
  } catch (err) {
    console.warn('Failed to parse dropped object:', err);
  }
  return null;
}

export function generateAssistantAnalysis(obj: WorkspaceObject): string {
  switch (obj.objectType) {
    case 'task':
      return `### 📋 Task Inspection: **${obj.title}** (${obj.id})
- **Status:** \`${obj.subtitle || 'Queued'}\`
- **Details:** ${obj.details || 'No extended criteria provided.'}
${obj.meta?.priority ? `- **Priority:** \`${obj.meta.priority}\`` : ''}
${obj.meta?.tag ? `- **Tag:** \`#${obj.meta.tag}\`` : ''}

**Suggested Next Steps:**
1. Execute run on default target with \`headroom:code\` container.
2. Verify dependency locks before transitioning to **In Review**.
3. Auto-generate PR or test suite for verification.`;

    case 'service':
      return `### ⚡ Service Inspection: **${obj.title}**
- **Status:** \`${obj.subtitle || 'active'}\`
- **Command:** \`${obj.details || 'N/A'}\`
${obj.meta?.port ? `- **Bound Port:** \`localhost:${obj.meta.port}\`` : '- **Port:** Unbound daemon / stdio'}
${obj.meta?.uptime ? `- **Uptime:** \`${obj.meta.uptime}\`` : ''}

**Diagnostic Capabilities:**
- Run \`curl -sI http://localhost:${obj.meta?.port || '8787'}/health\` to probe readiness.
- Stream container standard error / output logs to active run buffer.
- Restart service or inspect memory footprint.`;

    case 'run':
      return `### 🚀 Execution Run Inspection: **${obj.title}** (${obj.id})
- **Target Machine:** \`${obj.subtitle || 'local'}\`
- **Duration / Time:** \`${obj.details || 'instant'}\`
${obj.meta?.lock ? `- **Resource Lock:** \`${obj.meta.lock}\`` : ''}
${obj.meta?.exitCode !== undefined ? `- **Exit Code:** \`${obj.meta.exitCode}\`` : ''}

**Run Telemetry:**
- Resource lock was safely acquired and isolated from concurrent threads.
- Ready to inspect trace logs, re-run with modified flags, or benchmark latency.`;

    case 'model':
      return `### 🧠 LLM Model Weights Inspection: **${obj.title}**
- **Family / Architecture:** \`${obj.meta?.family || obj.subtitle || 'Quantized GGUF'}\`
- **Hash / Checksum:** \`${obj.meta?.hash || obj.id}\`
- **Context Length:** \`${obj.meta?.contextLength || '32,768 tokens'}\`
- **VRAM Footprint:** \`${obj.meta?.vram || '4.8 GB RAM'}\`
${obj.meta?.instructFormat ? `- **Prompt Template Format:** \`${obj.meta.instructFormat}\`` : ''}

**LLM Inference & Serving Guidance:**
- Fully compatible with \`ollama\` and local \`headroom:code\` inference daemons.
- Optimized for code generation, agentic tool calling, and high-speed token completion.
- Ready to attach to an active runtime service or run latency benchmarks.`;

    case 'automation':
      return `### 🔄 Automation Rule Inspection: **${obj.title}**
- **Trigger:** \`${obj.subtitle || 'event'}\`
- **Action:** ${obj.details || 'Launches run on target'}
${obj.meta?.target ? `- **Bound Target:** \`${obj.meta.target}\`` : ''}
${obj.meta?.lastRun ? `- **Last Triggered:** \`${obj.meta.lastRun}\`` : ''}

**Automation Control:**
- Rule status is active and listening for webhook / cron ticks.
- Would you like to dry-run this automation or modify parameter mappings?`;

    case 'target':
      return `### 🎯 Target Workspace Inspection: **${obj.title}**
- **Location:** \`${obj.subtitle || '.'}\`
- **Hardware / Specs:** ${obj.details || 'Local Node'}
${obj.meta?.status ? `- **Connection:** \`${obj.meta.status}\`` : ''}
${obj.meta?.usage ? `- **Load:** \`${obj.meta.usage}\`` : ''}

**Target Operations:**
- Ready to dispatch execution runs, verify disk quota, or inspect git workspace index.`;

    default:
      return `### 📦 Object Inspection: **${obj.title}**
- **Type:** \`${obj.objectType}\`
- **ID:** \`${obj.id}\`
- **Details:** ${obj.details || 'N/A'}`;
  }
}
