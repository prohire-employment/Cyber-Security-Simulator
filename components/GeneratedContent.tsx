/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, {useEffect, useRef, useState} from 'react';
import {InteractionData, VirtualFileSystem} from '../types';

interface GeneratedContentProps {
  htmlContent: string;
  onInteract: (data: InteractionData) => void;
  appContext: string | null;
  isLoading: boolean;
  onStateUpdate?: (newState: {
    vfs?: VirtualFileSystem;
    path?: string[];
  }) => void;
  onFileUpload?: (file: File) => void;
  terminalCommandHistory?: string[];
  onSystemCommand?: (command: string) => void;
}

// --- Custom Hooks for Logic Separation ---

/**
 * Manages terminal command history navigation (Up/Down arrows).
 */
const useTerminalHistory = (
  containerRef: React.RefObject<HTMLDivElement>,
  terminalCommandHistory: string[],
) => {
  const [commandHistoryIndex, setCommandHistoryIndex] = useState<number>(
    terminalCommandHistory.length,
  );

  useEffect(() => {
    setCommandHistoryIndex(terminalCommandHistory.length);
  }, [terminalCommandHistory]);

  useEffect(() => {
    const terminalInput =
      containerRef.current?.querySelector<HTMLInputElement>('#terminal_input');
    if (!terminalInput) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setCommandHistoryIndex((prevIndex) => {
          const newIndex = Math.max(0, prevIndex - 1);
          terminalInput.value = terminalCommandHistory[newIndex] || '';
          return newIndex;
        });
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setCommandHistoryIndex((prevIndex) => {
          const newIndex = Math.min(
            terminalCommandHistory.length,
            prevIndex + 1,
          );
          terminalInput.value = terminalCommandHistory[newIndex] || '';
          return newIndex;
        });
      }
    };

    terminalInput.addEventListener('keydown', handleKeyDown);
    return () => terminalInput.removeEventListener('keydown', handleKeyDown);
  }, [terminalCommandHistory, containerRef]);
};

/**
 * Manages user interactions via event delegation on the container.
 */
const useInteractionHandler = (
  containerRef: React.RefObject<HTMLDivElement>,
  onInteract: (data: InteractionData) => void,
  appContext: string | null,
) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleClick = (event: MouseEvent) => {
      let target = event.target as HTMLElement;
      while (target && target !== container && !target.dataset.interactionId) {
        target = target.parentElement as HTMLElement;
      }
      if (target?.dataset.interactionId) {
        event.preventDefault();
        const valueFromIds = target.dataset.valueFrom?.split(',');
        let value = target.dataset.interactionValue;
        if (valueFromIds?.length) {
          value = valueFromIds
            .map((id) => {
              const input = document.getElementById(id.trim()) as
                | HTMLInputElement
                | HTMLSelectElement
                | HTMLTextAreaElement;
              return input?.value ?? '';
            })
            .join(',');
        }
        onInteract({
          id: target.dataset.interactionId,
          type: target.dataset.interactionType || 'generic_click',
          value,
          elementType: target.tagName.toLowerCase(),
          elementText: (
            target.innerText || (target as HTMLInputElement).value || ''
          )
            .trim()
            .substring(0, 75),
          appContext,
        });
      }
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [onInteract, appContext, containerRef]);
};

/**
 * Manages observers for file uploads, state updates, and system commands from the LLM.
 */
const useDomObservers = (
  containerRef: React.RefObject<HTMLDivElement>,
  {
    onFileUpload,
    onStateUpdate,
    onSystemCommand,
  }: {
    onFileUpload?: (file: File) => void;
    onStateUpdate?: (newState: {
      vfs?: VirtualFileSystem;
      path?: string[];
    }) => void;
    onSystemCommand?: (command: string) => void;
  },
) => {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // File Upload Handler
    const fileInput = container.querySelector<HTMLInputElement>('#file-upload');
    const handleFileChange = (event: Event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file && onFileUpload) onFileUpload(file);
    };
    fileInput?.addEventListener('change', handleFileChange);

    // MutationObserver for state and system commands
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof HTMLElement) {
            // State Update
            if (node.id === 'terminal-state-update' && onStateUpdate) {
              try {
                const vfs = node.dataset.vfs ? JSON.parse(node.dataset.vfs) : undefined;
                const path = node.dataset.path ? JSON.parse(node.dataset.path) : undefined;
                if (vfs || path) onStateUpdate({vfs, path});
              } catch (e) {
                console.error('Failed to parse state update:', e);
              }
              node.remove();
            }
            // System Command
            if (node.id === 'system-command' && onSystemCommand && node.dataset.command) {
              onSystemCommand(node.dataset.command);
              node.remove();
            }
          }
        }
      }
    });

    observer.observe(container, {childList: true, subtree: true});

    return () => {
      fileInput?.removeEventListener('change', handleFileChange);
      observer.disconnect();
    };
  }, [containerRef, onFileUpload, onStateUpdate, onSystemCommand]);
};

/**
 * Manages the execution of scripts injected into the HTML content.
 */
const useScriptExecution = (
  containerRef: React.RefObject<HTMLDivElement>,
  htmlContent: string,
  isLoading: boolean,
) => {
  useEffect(() => {
    if (!isLoading && containerRef.current) {
      const scripts = Array.from(
        containerRef.current.getElementsByTagName('script'),
      );
      scripts.forEach((oldScript) => {
        const newScript = document.createElement('script');
        newScript.text = oldScript.innerHTML;
        oldScript.parentNode?.replaceChild(newScript, oldScript);
      });
    }
  }, [htmlContent, isLoading, containerRef]);
};

// --- Main Component ---

export const GeneratedContent: React.FC<GeneratedContentProps> = ({
  htmlContent,
  onInteract,
  appContext,
  isLoading,
  onStateUpdate,
  onFileUpload,
  onSystemCommand,
  terminalCommandHistory = [],
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  // Employ custom hooks to manage distinct functionalities
  useTerminalHistory(contentRef, terminalCommandHistory);
  useInteractionHandler(contentRef, onInteract, appContext);
  useDomObservers(contentRef, {onFileUpload, onStateUpdate, onSystemCommand});
  useScriptExecution(contentRef, htmlContent, isLoading);

  return (
    <div
      ref={contentRef}
      className="w-full h-full overflow-y-auto"
      dangerouslySetInnerHTML={{__html: htmlContent}}
    />
  );
};
