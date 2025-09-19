/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */

export interface AppDefinition {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export type VirtualFileSystem = {
  [key: string]: VirtualFileSystem | string;
};

export interface InteractionData {
  id: string;
  type: string;
  value?: string;
  elementType: string;
  elementText: string;
  appContext: string | null;
  virtualFileSystem?: VirtualFileSystem;
  terminalCommandHistory?: string[];
  currentPath?: string[];
}

// State and Reducer Action types for useReducer
export interface AppState {
  activeApp: AppDefinition | null;
  previousActiveApp: AppDefinition | null;
  llmContent: string;
  isLoading: boolean;
  error: string | null;
  interactionHistory: InteractionData[];
  isParametersOpen: boolean;
  currentAppPath: string[];
  virtualFileSystem: VirtualFileSystem;
  terminalCommandHistory: string[];
  currentMaxHistoryLength: number;
  isStatefulnessEnabled: boolean;
  isQuietModeEnabled: boolean;
  terminalColorScheme: string;
  terminalFontSize: number;
  initialNotepadContent: string | null;
}

export type AppAction =
  | {
      type: 'APP_OPEN';
      payload: {
        app: AppDefinition;
        initialPath: string[];
        initialHistory: InteractionData[];
      };
    }
  | {type: 'APP_CLOSE'}
  | {
      type: 'INTERACTION_START';
      payload: {
        interactionHistory: InteractionData[];
        currentAppPath: string[];
        terminalCommandHistory: string[];
      };
    }
  | {type: 'INTERACTION_SUCCESS_FROM_CACHE'; payload: string}
  | {type: 'STREAM_UPDATE'; payload: string}
  | {type: 'STREAM_COMPLETE'}
  | {type: 'STREAM_ERROR'; payload: string}
  | {type: 'TOGGLE_PARAMETERS'}
  | {
      type: 'UPDATE_SETTINGS';
      payload: {
        maxHistoryLength?: number;
        statefulness?: boolean;
        quietMode?: boolean;
      };
    }
  | {
      type: 'UPDATE_TERMINAL_SETTINGS';
      payload: {
        colorScheme?: string;
        fontSize?: number;
      };
    }
  | {
      type: 'SET_STATE';
      payload: Partial<AppState>;
    }
  | {type: 'CLEAR_HISTORY'}
  | {type: 'SET_INITIAL_NOTEPAD_CONTENT'; payload: string | null};
