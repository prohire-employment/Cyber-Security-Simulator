/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React, {useEffect, useState} from 'react';

interface ParametersPanelProps {
  currentLength: number;
  onUpdateHistoryLength: (newLength: number) => void;
  onClosePanel: () => void;
  isStatefulnessEnabled: boolean;
  onSetStatefulness: (enabled: boolean) => void;
  isQuietModeEnabled: boolean;
  onSetQuietMode: (enabled: boolean) => void;
  terminalColorScheme: string;
  terminalFontSize: number;
  onUpdateTerminalSettings: (settings: {
    colorScheme?: string;
    fontSize?: number;
  }) => void;
  onClearHistory: () => void;
  onSaveState: () => void;
  onLoadState: () => void;
  onClearSavedState: () => void;
}

export const ParametersPanel: React.FC<ParametersPanelProps> = ({
  currentLength,
  onUpdateHistoryLength,
  onClosePanel,
  isStatefulnessEnabled,
  onSetStatefulness,
  isQuietModeEnabled,
  onSetQuietMode,
  terminalColorScheme,
  terminalFontSize,
  onUpdateTerminalSettings,
  onClearHistory,
  onSaveState,
  onLoadState,
  onClearSavedState,
}) => {
  const [localHistoryLengthInput, setLocalHistoryLengthInput] =
    useState<string>(currentLength.toString());
  const [localStatefulnessChecked, setLocalStatefulnessChecked] =
    useState<boolean>(isStatefulnessEnabled);
  const [localQuietModeChecked, setLocalQuietModeChecked] =
    useState<boolean>(isQuietModeEnabled);
  const [localColorScheme, setLocalColorScheme] =
    useState<string>(terminalColorScheme);
  const [localFontSize, setLocalFontSize] = useState<string>(
    terminalFontSize.toString(),
  );

  useEffect(() => {
    setLocalHistoryLengthInput(currentLength.toString());
  }, [currentLength]);

  useEffect(() => {
    setLocalStatefulnessChecked(isStatefulnessEnabled);
  }, [isStatefulnessEnabled]);

  useEffect(() => {
    setLocalQuietModeChecked(isQuietModeEnabled);
  }, [isQuietModeEnabled]);

  useEffect(() => {
    setLocalColorScheme(terminalColorScheme);
  }, [terminalColorScheme]);

  useEffect(() => {
    setLocalFontSize(terminalFontSize.toString());
  }, [terminalFontSize]);

  const handleHistoryLengthInputChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setLocalHistoryLengthInput(event.target.value);
  };

  const handleStatefulnessCheckboxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setLocalStatefulnessChecked(event.target.checked);
  };

  const handleQuietModeCheckboxChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setLocalQuietModeChecked(event.target.checked);
  };

  const handleColorSchemeChange = (
    event: React.ChangeEvent<HTMLSelectElement>,
  ) => {
    setLocalColorScheme(event.target.value);
  };

  const handleFontSizeChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setLocalFontSize(event.target.value);
  };

  const handleApplyParameters = () => {
    const newLength = parseInt(localHistoryLengthInput, 10);
    if (!isNaN(newLength) && newLength >= 0 && newLength <= 10) {
      onUpdateHistoryLength(newLength);
    } else {
      alert('Please enter a number between 0 and 10 for history length.');
      setLocalHistoryLengthInput(currentLength.toString());
      return;
    }

    if (localStatefulnessChecked !== isStatefulnessEnabled) {
      onSetStatefulness(localStatefulnessChecked);
    }

    if (localQuietModeChecked !== isQuietModeEnabled) {
      onSetQuietMode(localQuietModeChecked);
    }

    const newFontSize = parseInt(localFontSize, 10);
    if (!isNaN(newFontSize) && newFontSize >= 8 && newFontSize <= 24) {
      onUpdateTerminalSettings({
        colorScheme: localColorScheme,
        fontSize: newFontSize,
      });
    } else {
      alert('Please enter a font size between 8 and 24.');
      setLocalFontSize(terminalFontSize.toString());
      return;
    }

    onClosePanel();
  };

  const handleClose = () => {
    setLocalHistoryLengthInput(currentLength.toString());
    setLocalStatefulnessChecked(isStatefulnessEnabled);
    setLocalQuietModeChecked(isQuietModeEnabled);
    setLocalColorScheme(terminalColorScheme);
    setLocalFontSize(terminalFontSize.toString());
    onClosePanel();
  };

  return (
    <div className="p-6 bg-gray-800 text-gray-200 h-full flex flex-col items-start pt-8 overflow-y-auto">
      {/* General Settings */}
      <div className="w-full max-w-md mb-6">
        <div className="llm-row items-center">
          <label
            htmlFor="maxHistoryLengthInput"
            className="llm-label whitespace-nowrap mr-3 flex-shrink-0"
            style={{minWidth: '150px'}}>
            Max History Length:
          </label>
          <input
            type="number"
            id="maxHistoryLengthInput"
            value={localHistoryLengthInput}
            onChange={handleHistoryLengthInputChange}
            min="0"
            max="10"
            className="llm-input flex-grow"
            aria-describedby="historyLengthHelpText"
          />
        </div>
      </div>

      <div className="w-full max-w-md mb-4">
        <div className="llm-row items-center">
          <label
            htmlFor="statefulnessCheckbox"
            className="llm-label whitespace-nowrap mr-3 flex-shrink-0"
            style={{minWidth: '150px'}}>
            Enable Statefulness:
          </label>
          <input
            type="checkbox"
            id="statefulnessCheckbox"
            checked={localStatefulnessChecked}
            onChange={handleStatefulnessCheckboxChange}
            className="h-5 w-5 text-blue-500 border-gray-600 rounded focus:ring-blue-500 cursor-pointer bg-gray-700"
            aria-describedby="statefulnessHelpText"
          />
        </div>
      </div>

      <div className="w-full max-w-md mb-4">
        <div className="llm-row items-center">
          <label
            htmlFor="quietModeCheckbox"
            className="llm-label whitespace-nowrap mr-3 flex-shrink-0"
            style={{minWidth: '150px'}}>
            Quiet Mode:
          </label>
          <input
            type="checkbox"
            id="quietModeCheckbox"
            checked={localQuietModeChecked}
            onChange={handleQuietModeCheckboxChange}
            className="h-5 w-5 text-blue-500 border-gray-600 rounded focus:ring-blue-500 cursor-pointer bg-gray-700"
            aria-describedby="quietModeHelpText"
          />
        </div>
      </div>

      {/* Terminal Appearance */}
      <div className="w-full max-w-md mt-6 pt-6 border-t border-gray-600">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">
          Terminal Appearance
        </h3>
        <div className="w-full max-w-md mb-4">
          <div className="llm-row items-center">
            <label
              htmlFor="terminalColorSchemeSelect"
              className="llm-label whitespace-nowrap mr-3 flex-shrink-0"
              style={{minWidth: '150px'}}>
              Color Scheme:
            </label>
            <select
              id="terminalColorSchemeSelect"
              value={localColorScheme}
              onChange={handleColorSchemeChange}
              className="llm-input flex-grow">
              <option value="default">Default (Green)</option>
              <option value="amber">Amber</option>
              <option value="white">Monochrome</option>
              <option value="scanlines">Retro (Scanlines)</option>
            </select>
          </div>
        </div>
        <div className="w-full max-w-md mb-4">
          <div className="llm-row items-center">
            <label
              htmlFor="terminalFontSizeInput"
              className="llm-label whitespace-nowrap mr-3 flex-shrink-0"
              style={{minWidth: '150px'}}>
              Font Size (8-24px):
            </label>
            <input
              type="number"
              id="terminalFontSizeInput"
              value={localFontSize}
              onChange={handleFontSizeChange}
              min="8"
              max="24"
              className="llm-input flex-grow"
            />
          </div>
        </div>
      </div>

      {/* State Management */}
      <div className="w-full max-w-md mt-6 pt-6 border-t border-gray-600">
        <h3 className="text-lg font-semibold text-gray-200 mb-4">
          State Management
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Save or load the entire application state, including open apps, file
          system, and terminal history.
        </p>
        <div className="flex justify-start gap-3">
          <button
            onClick={onSaveState}
            className="llm-button"
            aria-label="Save current application state">
            Save State
          </button>
          <button
            onClick={onLoadState}
            className="llm-button"
            aria-label="Load saved application state">
            Load State
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 w-full max-w-md flex justify-start gap-3">
        <button
          onClick={handleApplyParameters}
          className="llm-button"
          aria-label="Apply all parameter settings and close">
          Apply Parameters
        </button>
        <button
          onClick={handleClose}
          className="llm-button bg-gray-600 hover:bg-gray-700 active:bg-gray-800"
          aria-label="Close parameters panel without applying current changes">
          Close Parameters
        </button>
      </div>

      {/* Danger Zone */}
      <div className="w-full max-w-md mt-6 pt-6 border-t border-red-500/30">
        <h3 className="text-lg font-semibold text-red-400 mb-2">
          Danger Zone
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          These actions are irreversible. Please be certain.
        </p>
        <div className="flex flex-col items-start gap-3">
          <button
            onClick={onClearHistory}
            className="llm-button bg-red-700 hover:bg-red-800 active:bg-red-900"
            aria-label="Clear all interaction and command history for the current session">
            Clear Session History
          </button>
          <button
            onClick={onClearSavedState}
            className="llm-button bg-red-700 hover:bg-red-800 active:bg-red-900"
            aria-label="Clear the saved application state from the browser">
            Clear Saved State
          </button>
        </div>
      </div>
    </div>
  );
};
