/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import {GoogleGenAI} from '@google/genai';
import {APP_DEFINITIONS_CONFIG, getSystemPrompt} from '../constants';
import {InteractionData} from '../types';

if (!process.env.API_KEY) {
  console.error(
    'API_KEY environment variable is not set. The application will not be able to connect to the Gemini API.',
  );
}

const ai = new GoogleGenAI({apiKey: process.env.API_KEY!});

export async function* streamAppContent(
  interactionHistory: InteractionData[],
  currentMaxHistoryLength: number,
  isQuietModeEnabled: boolean,
): AsyncGenerator<string, void, void> {
  const model = 'gemini-2.5-flash';

  if (!process.env.API_KEY) {
    yield `<div class="p-4 text-red-400 bg-red-900/50 rounded-md">
      <p class="font-bold text-lg">Configuration Error</p>
      <p class="mt-2">The API_KEY is not configured. Please set the API_KEY environment variable.</p>
    </div>`;
    return;
  }

  if (interactionHistory.length === 0) {
    yield `<div class="p-4 text-orange-400 bg-orange-900/50 rounded-md">
      <p class="font-bold text-lg">No interaction data provided.</p>
    </div>`;
    return;
  }

  const systemPrompt = getSystemPrompt(
    currentMaxHistoryLength,
    isQuietModeEnabled,
  );

  const currentInteraction = interactionHistory[0];
  const pastInteractions = interactionHistory.slice(1);

  const currentElementName =
    currentInteraction.elementText || currentInteraction.id || 'Unknown Element';
  const currentAppDef = APP_DEFINITIONS_CONFIG.find(
    (app) => app.id === currentInteraction.appContext,
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const {virtualFileSystem, ...interactionWithoutVfs} = currentInteraction;

  let contextBlock = `--- START CONTEXT ---
## Current Interaction
- App: ${currentAppDef?.name || currentInteraction.appContext || 'Desktop'}
- Interaction ID: ${currentInteraction.id}
- Interaction Type: ${currentInteraction.type}
- Element Text: ${currentElementName}
- Value: ${currentInteraction.value ? `'${currentInteraction.value.substring(0, 100)}'` : 'N/A'}`;

  if (
    ['terminal_app', 'file_explorer_app'].includes(
      currentInteraction.appContext!,
    )
  ) {
    const path = currentInteraction.currentPath || [];
    contextBlock += `

## App State
- Current Path: /${path.join('/')}
- Virtual File System (VFS): ${JSON.stringify(currentInteraction.virtualFileSystem, null, 2)}`;

    if (currentInteraction.appContext === 'terminal_app') {
      contextBlock += `
- Terminal Command History (this session): ${JSON.stringify(currentInteraction.terminalCommandHistory)}`;
    }
  }

  if (pastInteractions.length > 0) {
    contextBlock += `

## Recent History (${pastInteractions.length} previous interactions)
${pastInteractions
  .map((p, i) => {
    const appDef = APP_DEFINITIONS_CONFIG.find((app) => app.id === p.appContext);
    const appName = p.appContext ? appDef?.name || p.appContext : 'N/A';
    return `${i + 1}. (App: ${appName}) Clicked '${p.elementText || p.id}'`;
  })
  .join('\n')}`;
  }

  contextBlock += `

## Raw Interaction Data (for reference)
${JSON.stringify(interactionWithoutVfs, null, 2)}
--- END CONTEXT ---`;

  const fullPrompt = `${systemPrompt}

${contextBlock}

Based on the context provided above, generate the HTML content for the window's content area.`;

  try {
    const response = await ai.models.generateContentStream({
      model: model,
      contents: fullPrompt,
      config: {},
    });

    for await (const chunk of response) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error('Error streaming from Gemini:', error);
    let errorMessage = 'An error occurred while generating content.';
    if (error instanceof Error) {
      errorMessage += ` Details: ${error.message}`;
    } else if (
      typeof error === 'object' &&
      error !== null &&
      'message' in error
    ) {
      errorMessage += ` Details: ${(error as {message: string}).message}`;
    } else if (typeof error === 'string') {
      errorMessage += ` Details: ${error}`;
    }

    yield `<div class="p-4 text-red-400 bg-red-900/50 rounded-md">
      <p class="font-bold text-lg">Error Generating Content</p>
      <p class="mt-2">${errorMessage}</p>
      <p class="mt-1">This may be due to an API key issue, network problem, or misconfiguration. Please check the developer console for more details.</p>
    </div>`;
  }
}
