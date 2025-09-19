/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, {
  useCallback,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import {GeneratedContent} from './components/GeneratedContent';
import {Icon} from './components/Icon';
import {ParametersPanel} from './components/ParametersPanel';
import {Window} from './components/Window';
import {
  APP_DEFINITIONS_CONFIG,
  INITIAL_MAX_HISTORY_LENGTH,
} from './constants';
import {streamAppContent} from './services/geminiService';
import {
  AppDefinition,
  InteractionData,
  VirtualFileSystem,
  AppAction,
  AppState,
} from './types';

const setPathContent = (
  vfs: VirtualFileSystem,
  path: string[],
  content: VirtualFileSystem | string,
): VirtualFileSystem => {
  const newVfs = JSON.parse(JSON.stringify(vfs)); // Deep copy
  let current = newVfs;

  for (let i = 0; i < path.length - 1; i++) {
    const part = path[i];
    if (current[part] === undefined) {
      current[part] = {};
    }
    current = current[part] as VirtualFileSystem;
  }

  current[path[path.length - 1]] = content;
  return newVfs;
};

const initialState: AppState = {
  activeApp: null,
  previousActiveApp: null,
  llmContent: '',
  isLoading: false,
  error: null,
  interactionHistory: [],
  isParametersOpen: false,
  currentAppPath: [],
  virtualFileSystem: {
    home: {
      user: {
        documents: {
          'report.txt': 'This is a sample report file.',
        },
        'notes.txt': 'Pentesting notes...',
      },
    },
    etc: {
      shadow: `root:$6$salt$hacker:18635:0:99999:7:::\nuser:$6$salt$pleasentry:18635:0:99999:7:::\nguest::18635:0:99999:7:::\n`,
    },
  },
  terminalCommandHistory: [],
  currentMaxHistoryLength: INITIAL_MAX_HISTORY_LENGTH,
  isStatefulnessEnabled: false,
  isQuietModeEnabled: false,
  terminalColorScheme: 'default',
  terminalFontSize: 14,
  initialNotepadContent: null,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'APP_OPEN': {
      const {app, initialPath, initialHistory} = action.payload;
      return {
        ...state,
        activeApp: app,
        isParametersOpen: false,
        llmContent: '',
        error: null,
        currentAppPath: initialPath,
        interactionHistory: initialHistory,
        terminalCommandHistory:
          app.id === 'terminal_app' ? [] : state.terminalCommandHistory,
        initialNotepadContent: null, // Reset on any app open
      };
    }
    case 'APP_CLOSE':
      return {
        ...state,
        activeApp: null,
        llmContent: '',
        error: null,
        interactionHistory: [],
        currentAppPath: [],
        initialNotepadContent: null, // Reset on close
      };
    case 'INTERACTION_START':
      return {
        ...state,
        isLoading: true,
        error: null,
        llmContent: '',
        ...action.payload,
      };
    case 'INTERACTION_SUCCESS_FROM_CACHE':
      return {
        ...state,
        isLoading: false,
        llmContent: action.payload,
      };
    case 'STREAM_UPDATE':
      return {
        ...state,
        llmContent: state.llmContent + action.payload,
      };
    case 'STREAM_COMPLETE':
      return {
        ...state,
        isLoading: false,
      };
    case 'STREAM_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
        llmContent: `<div class="p-4 text-red-400 bg-red-900/50 rounded-md">${action.payload}</div>`,
      };
    case 'TOGGLE_PARAMETERS':
      return {
        ...state,
        isParametersOpen: !state.isParametersOpen,
        activeApp: state.isParametersOpen ? state.previousActiveApp : null,
        previousActiveApp: state.isParametersOpen ? null : state.activeApp,
        llmContent: '',
        error: null,
        interactionHistory: state.isParametersOpen
          ? []
          : state.interactionHistory,
        currentAppPath: state.isParametersOpen ? [] : state.currentAppPath,
      };
    case 'UPDATE_SETTINGS': {
      const {maxHistoryLength} = action.payload;
      return {
        ...state,
        currentMaxHistoryLength:
          maxHistoryLength ?? state.currentMaxHistoryLength,
        isStatefulnessEnabled:
          action.payload.statefulness ?? state.isStatefulnessEnabled,
        isQuietModeEnabled:
          action.payload.quietMode ?? state.isQuietModeEnabled,
        interactionHistory: maxHistoryLength
          ? state.interactionHistory.slice(0, maxHistoryLength)
          : state.interactionHistory,
      };
    }
    case 'UPDATE_TERMINAL_SETTINGS':
      return {
        ...state,
        terminalColorScheme:
          action.payload.colorScheme ?? state.terminalColorScheme,
        terminalFontSize: action.payload.fontSize ?? state.terminalFontSize,
      };
    case 'SET_STATE':
      return {
        ...state,
        ...action.payload,
      };
    case 'CLEAR_HISTORY':
      return {
        ...state,
        interactionHistory: [],
        terminalCommandHistory: [],
      };
    case 'SET_INITIAL_NOTEPAD_CONTENT':
      return {
        ...state,
        initialNotepadContent: action.payload,
      };
    default:
      return state;
  }
}

const DesktopView: React.FC<{onAppOpen: (app: AppDefinition) => void}> = ({
  onAppOpen,
}) => (
  <div className="flex flex-wrap content-start p-4">
    {APP_DEFINITIONS_CONFIG.map((app) => (
      <Icon key={app.id} app={app} onInteract={() => onAppOpen(app)} />
    ))}
  </div>
);

const App: React.FC = () => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [appContentCache, setAppContentCache] = useState<
    Record<string, string>
  >({});
  const notepadContentInitialized = useRef(false);
  const STORAGE_KEY = 'pentestSimState';

  const {
    activeApp,
    llmContent,
    isLoading,
    error,
    interactionHistory,
    isParametersOpen,
    currentAppPath,
    virtualFileSystem,
    terminalCommandHistory,
    currentMaxHistoryLength,
    isStatefulnessEnabled,
    isQuietModeEnabled,
    terminalColorScheme,
    terminalFontSize,
    initialNotepadContent,
  } = state;

  // Effect to capture the initial state of the notepad for "dirty" checking
  useEffect(() => {
    if (activeApp?.id === 'notes_app' && !isLoading && llmContent) {
      if (!notepadContentInitialized.current) {
        const textarea = document.getElementById(
          'notepad-textarea',
        ) as HTMLTextAreaElement;
        if (textarea) {
          dispatch({
            type: 'SET_INITIAL_NOTEPAD_CONTENT',
            payload: textarea.value,
          });
          notepadContentInitialized.current = true;
        }
      }
    } else if (activeApp?.id !== 'notes_app') {
      // Reset when navigating away from the notes app
      notepadContentInitialized.current = false;
    }
  }, [activeApp, isLoading, llmContent]);

  // Effect to reset the initial notepad content state after a save operation
  useEffect(() => {
    const lastInteraction = interactionHistory[0];
    if (
      lastInteraction?.appContext === 'notes_app' &&
      (lastInteraction.id === 'notepad_save' ||
        lastInteraction.id === 'notepad_save_and_close' ||
        lastInteraction.id === 'notepad_save_and_new') &&
      !isLoading
    ) {
      const textarea = document.getElementById(
        'notepad-textarea',
      ) as HTMLTextAreaElement;
      if (textarea) {
        dispatch({
          type: 'SET_INITIAL_NOTEPAD_CONTENT',
          payload: textarea.value,
        });
      }
    }
  }, [interactionHistory, isLoading]);

  const internalHandleLlmRequest = useCallback(
    async (
      historyForLlm: InteractionData[],
      maxHistoryLength: number,
      quietMode: boolean,
    ) => {
      try {
        const stream = streamAppContent(
          historyForLlm,
          maxHistoryLength,
          quietMode,
        );
        for await (const chunk of stream) {
          dispatch({type: 'STREAM_UPDATE', payload: chunk});
        }
      } catch (e: any) {
        console.error(e);
        dispatch({
          type: 'STREAM_ERROR',
          payload: 'Failed to stream content from the API.',
        });
      } finally {
        dispatch({type: 'STREAM_COMPLETE'});
      }
    },
    [],
  );

  const performLlmRequest = useCallback(
    (
      history: InteractionData[],
      path: string[],
      terminalHistory: string[],
    ) => {
      dispatch({
        type: 'INTERACTION_START',
        payload: {
          interactionHistory: history,
          currentAppPath: path,
          terminalCommandHistory: terminalHistory,
        },
      });

      const cacheKey = path.join('__');
      if (isStatefulnessEnabled && appContentCache[cacheKey]) {
        dispatch({
          type: 'INTERACTION_SUCCESS_FROM_CACHE',
          payload: appContentCache[cacheKey],
        });
        return;
      }

      internalHandleLlmRequest(
        history,
        currentMaxHistoryLength,
        isQuietModeEnabled,
      );
    },
    [
      internalHandleLlmRequest,
      appContentCache,
      isStatefulnessEnabled,
      currentMaxHistoryLength,
      isQuietModeEnabled,
    ],
  );

  const performLlmRequestRef = useRef(performLlmRequest);
  useEffect(() => {
    performLlmRequestRef.current = performLlmRequest;
  }, [performLlmRequest]);

  useEffect(() => {
    const savedStateJSON = localStorage.getItem(STORAGE_KEY);
    if (savedStateJSON) {
      if (
        window.confirm('A saved state was found. Would you like to load it?')
      ) {
        const savedState = JSON.parse(savedStateJSON);
        const activeApp =
          APP_DEFINITIONS_CONFIG.find(
            (app) => app.id === savedState.activeAppId,
          ) || null;
        dispatch({
          type: 'SET_STATE',
          payload: {
            ...initialState,
            ...savedState,
            activeApp: activeApp,
          },
        });
        if (activeApp && savedState.interactionHistory.length > 0) {
          performLlmRequestRef.current(
            savedState.interactionHistory,
            savedState.currentAppPath,
            savedState.terminalCommandHistory,
          );
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (
      !isLoading &&
      currentAppPath.length > 0 &&
      isStatefulnessEnabled &&
      llmContent
    ) {
      const cacheKey = currentAppPath.join('__');
      if (appContentCache[cacheKey] !== llmContent) {
        setAppContentCache((prevCache) => ({
          ...prevCache,
          [cacheKey]: llmContent,
        }));
      }
    }
  }, [
    llmContent,
    isLoading,
    currentAppPath,
    isStatefulnessEnabled,
    appContentCache,
  ]);

  const handleInteraction = useCallback(
    async (interactionData: InteractionData) => {
      let nextPath = currentAppPath;
      if (activeApp?.id === 'file_explorer_app') {
        switch (interactionData.id) {
          case 'file_explorer_open_dir':
          case 'file_explorer_open_file':
            if (interactionData.value) {
              nextPath = [...currentAppPath, interactionData.value];
            }
            break;
          case 'file_explorer_up':
            if (currentAppPath.length > 1) {
              nextPath = currentAppPath.slice(0, -1);
            }
            break;
        }
      }

      let updatedTerminalCommandHistory = terminalCommandHistory;
      if (
        interactionData.appContext === 'terminal_app' &&
        interactionData.id === 'terminal_run_command' &&
        interactionData.value
      ) {
        updatedTerminalCommandHistory = [
          ...terminalCommandHistory,
          interactionData.value,
        ];
      }

      const interactionWithContext = {...interactionData};
      if (
        ['terminal_app', 'file_explorer_app'].includes(
          interactionWithContext.appContext!,
        )
      ) {
        interactionWithContext.virtualFileSystem =
          interactionData.virtualFileSystem ?? virtualFileSystem;
        interactionWithContext.currentPath = nextPath;
      }
      if (interactionWithContext.appContext === 'terminal_app') {
        interactionWithContext.terminalCommandHistory =
          updatedTerminalCommandHistory;
      }

      const newHistory = [
        interactionWithContext,
        ...interactionHistory.slice(0, currentMaxHistoryLength - 1),
      ];

      performLlmRequest(newHistory, nextPath, updatedTerminalCommandHistory);
    },
    [
      activeApp,
      currentAppPath,
      terminalCommandHistory,
      virtualFileSystem,
      interactionHistory,
      currentMaxHistoryLength,
      performLlmRequest,
    ],
  );

  const handleAppOpen = useCallback(
    (app: AppDefinition) => {
      let initialPath: string[];
      switch (app.id) {
        case 'terminal_app':
          initialPath = ['home', 'user'];
          break;
        case 'file_explorer_app':
          initialPath = ['home'];
          break;
        default:
          initialPath = [app.id];
          break;
      }

      const initialInteraction: InteractionData = {
        id: app.id,
        type: 'app_open',
        elementText: app.name,
        elementType: 'icon',
        appContext: app.id,
        currentPath: initialPath,
      };

      if (['terminal_app', 'file_explorer_app'].includes(app.id)) {
        initialInteraction.virtualFileSystem = virtualFileSystem;
      }

      const newTerminalHistory =
        app.id === 'terminal_app' ? [] : terminalCommandHistory;

      if (app.id === 'terminal_app') {
        initialInteraction.terminalCommandHistory = newTerminalHistory;
      }

      const newHistory = [initialInteraction];

      dispatch({
        type: 'APP_OPEN',
        payload: {app, initialPath, initialHistory: newHistory},
      });

      performLlmRequest(newHistory, initialPath, newTerminalHistory);
    },
    [virtualFileSystem, terminalCommandHistory, performLlmRequest],
  );

  const handleSystemCommand = useCallback((command: string) => {
    if (command === 'close_app') {
      dispatch({type: 'APP_CLOSE'});
    }
  }, []);

  const handleAppCloseRequest = useCallback(() => {
    if (activeApp?.id === 'notes_app') {
      const textarea = document.getElementById(
        'notepad-textarea',
      ) as HTMLTextAreaElement;
      // Check if content has changed
      if (
        textarea &&
        initialNotepadContent !== null &&
        textarea.value !== initialNotepadContent
      ) {
        if (
          window.confirm(
            'You have unsaved changes. Are you sure you want to exit to desktop?',
          )
        ) {
          dispatch({type: 'APP_CLOSE'});
        }
        // If user cancels, do nothing.
      } else {
        // If no changes, or textarea not found, close immediately.
        dispatch({type: 'APP_CLOSE'});
      }
    } else {
      // For any other app, close immediately.
      dispatch({type: 'APP_CLOSE'});
    }
  }, [activeApp, initialNotepadContent]);

  const handleToggleParametersPanel = useCallback(
    () => dispatch({type: 'TOGGLE_PARAMETERS'}),
    [],
  );

  const handleUpdateHistoryLength = useCallback((newLength: number) => {
    dispatch({type: 'UPDATE_SETTINGS', payload: {maxHistoryLength: newLength}});
  }, []);

  const handleSetStatefulness = useCallback((enabled: boolean) => {
    if (!enabled) setAppContentCache({});
    dispatch({type: 'UPDATE_SETTINGS', payload: {statefulness: enabled}});
  }, []);

  const handleSetQuietMode = useCallback((enabled: boolean) => {
    dispatch({type: 'UPDATE_SETTINGS', payload: {quietMode: enabled}});
  }, []);

  const handleClearHistory = useCallback(() => {
    if (
      window.confirm(
        'Are you sure you want to clear all interaction and command history? This action cannot be undone.',
      )
    ) {
      dispatch({type: 'CLEAR_HISTORY'});
      setAppContentCache({});
    }
  }, []);

  const handleUpdateTerminalSettings = useCallback(
    (payload: {colorScheme?: string; fontSize?: number}) => {
      dispatch({type: 'UPDATE_TERMINAL_SETTINGS', payload});
    },
    [],
  );

  const handleStateUpdate = useCallback(
    (newState: {vfs?: VirtualFileSystem; path?: string[]}) => {
      const payload: Partial<
        Pick<AppState, 'virtualFileSystem' | 'currentAppPath'>
      > = {};
      if (newState.vfs) {
        payload.virtualFileSystem = newState.vfs;
      }
      if (newState.path) {
        payload.currentAppPath = newState.path;
      }

      if (Object.keys(payload).length > 0) {
        dispatch({type: 'SET_STATE', payload});
      }
    },
    [],
  );

  const handleFileUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const filePath = [...currentAppPath, file.name];
        const newVfs = setPathContent(virtualFileSystem, filePath, content);
        dispatch({type: 'SET_STATE', payload: {virtualFileSystem: newVfs}});

        const uploadInteraction: InteractionData = {
          id: 'terminal_file_uploaded',
          type: 'system_event',
          value: `File "${file.name}" uploaded successfully.`,
          elementType: 'system',
          elementText: 'File Upload',
          appContext: 'terminal_app',
          virtualFileSystem: newVfs,
        };
        handleInteraction(uploadInteraction);
      };
      reader.readAsText(file);
    },
    [virtualFileSystem, currentAppPath, handleInteraction],
  );

  const handleSaveState = useCallback(() => {
    const stateToSave = {
      activeAppId: state.activeApp?.id ?? null,
      interactionHistory: state.interactionHistory,
      currentAppPath: state.currentAppPath,
      virtualFileSystem: state.virtualFileSystem,
      terminalCommandHistory: state.terminalCommandHistory,
      currentMaxHistoryLength: state.currentMaxHistoryLength,
      isStatefulnessEnabled: state.isStatefulnessEnabled,
      isQuietModeEnabled: state.isQuietModeEnabled,
      terminalColorScheme: state.terminalColorScheme,
      terminalFontSize: state.terminalFontSize,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    alert('State saved successfully!');
  }, [state]);

  const handleLoadState = useCallback(() => {
    const savedStateJSON = localStorage.getItem(STORAGE_KEY);
    if (savedStateJSON) {
      if (
        window.confirm(
          'Are you sure you want to load the last saved state? Any unsaved progress will be lost.',
        )
      ) {
        const savedState = JSON.parse(savedStateJSON);
        const activeApp =
          APP_DEFINITIONS_CONFIG.find(
            (app) => app.id === savedState.activeAppId,
          ) || null;
        dispatch({
          type: 'SET_STATE',
          payload: {
            ...initialState,
            ...savedState,
            activeApp: activeApp,
          },
        });
        if (activeApp && savedState.interactionHistory.length > 0) {
          performLlmRequest(
            savedState.interactionHistory,
            savedState.currentAppPath,
            savedState.terminalCommandHistory,
          );
        }
        if (state.isParametersOpen) {
          dispatch({type: 'TOGGLE_PARAMETERS'});
        }
      }
    } else {
      alert('No saved state found.');
    }
  }, [performLlmRequest, state.isParametersOpen]);

  const handleClearSavedState = useCallback(() => {
    if (
      window.confirm(
        'Are you sure you want to delete your saved state? This cannot be undone.',
      )
    ) {
      localStorage.removeItem(STORAGE_KEY);
      alert('Saved state cleared.');
    }
  }, []);

  const getTitle = () => {
    if (isParametersOpen) return 'Blackbox OS';
    if (!activeApp) return 'Blackbox OS';
    if (['terminal_app', 'file_explorer_app'].includes(activeApp.id)) {
      const appName =
        activeApp.id === 'terminal_app' ? 'Terminal' : 'File System';
      return `${appName}: /${currentAppPath.join('/')}`;
    }
    return activeApp.name;
  };

  const windowTitle = `${getTitle()}${
    isQuietModeEnabled ? ' 🤫 (Quiet Mode)' : ''
  }`;

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-4">
      <Window
        title={windowTitle}
        onExitToDesktop={handleAppCloseRequest}
        isAppOpen={!!activeApp && !isParametersOpen}
        onToggleParameters={handleToggleParametersPanel}
        isParametersPanelOpen={isParametersOpen}>
        <div
          className="w-full h-full bg-transparent text-gray-200"
          style={{
            ...(activeApp?.id === 'terminal_app' && {
              fontSize: `${terminalFontSize}px`,
            }),
          }}
          data-terminal-scheme={
            activeApp?.id === 'terminal_app' ? terminalColorScheme : undefined
          }>
          {isParametersOpen ? (
            <ParametersPanel
              currentLength={currentMaxHistoryLength}
              onUpdateHistoryLength={handleUpdateHistoryLength}
              onClosePanel={handleToggleParametersPanel}
              isStatefulnessEnabled={isStatefulnessEnabled}
              onSetStatefulness={handleSetStatefulness}
              isQuietModeEnabled={isQuietModeEnabled}
              onSetQuietMode={handleSetQuietMode}
              terminalColorScheme={terminalColorScheme}
              terminalFontSize={terminalFontSize}
              onUpdateTerminalSettings={handleUpdateTerminalSettings}
              onClearHistory={handleClearHistory}
              onSaveState={handleSaveState}
              onLoadState={handleLoadState}
              onClearSavedState={handleClearSavedState}
            />
          ) : !activeApp ? (
            <DesktopView onAppOpen={handleAppOpen} />
          ) : (
            <>
              {isLoading && llmContent.length === 0 && (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-400"></div>
                </div>
              )}
              {error && !isLoading && (
                <div className="p-4 text-red-400 bg-red-900/50 rounded-md">
                  {error}
                </div>
              )}
              {(!isLoading || llmContent) && (
                <GeneratedContent
                  htmlContent={llmContent}
                  onInteract={handleInteraction}
                  appContext={activeApp.id}
                  isLoading={isLoading}
                  onStateUpdate={handleStateUpdate}
                  onFileUpload={handleFileUpload}
                  terminalCommandHistory={terminalCommandHistory}
                  onSystemCommand={handleSystemCommand}
                />
              )}
            </>
          )}
        </div>
      </Window>
    </div>
  );
};

export default App;
