/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
/* tslint:disable */
import React from 'react';

interface WindowProps {
  title: string;
  children: React.ReactNode;
  onExitToDesktop?: () => void;
  isAppOpen: boolean;
  appId?: string | null;
  onToggleParameters: () => void;
  isParametersPanelOpen?: boolean;
}

const MenuItem: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}> = ({children, onClick, className}) => (
  <span
    className={`menu-item cursor-pointer hover:text-blue-400 ${className}`}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') onClick?.();
    }}
    tabIndex={0}
    role="button">
    {children}
  </span>
);

export const Window: React.FC<WindowProps> = ({
  title,
  children,
  onExitToDesktop,
  isAppOpen,
  onToggleParameters,
  isParametersPanelOpen,
}) => {
  return (
    <div className="w-[800px] h-[600px] bg-gray-900/70 border border-gray-700/50 rounded-xl shadow-2xl flex flex-col relative overflow-hidden font-sans backdrop-blur-md text-gray-200">
      {/* Title Bar */}
      <div className="bg-gray-900/80 text-gray-200 py-2 px-4 font-semibold text-base flex justify-between items-center select-none cursor-default rounded-t-xl flex-shrink-0">
        <span className="title-bar-text">{title}</span>
      </div>

      {/* Menu Bar */}
      <div className="bg-gray-900/60 py-2 px-3 border-b border-gray-700/50 select-none flex gap-4 flex-shrink-0 text-sm text-gray-300 items-center">
        {!isParametersPanelOpen && (
          <MenuItem onClick={onToggleParameters}>
            <u>P</u>arameters
          </MenuItem>
        )}
        {isAppOpen && !isParametersPanelOpen && (
          <MenuItem onClick={onExitToDesktop} className="ml-auto">
            Exit to Desktop
          </MenuItem>
        )}
      </div>

      {/* Content */}
      <div className="flex-grow overflow-y-auto">{children}</div>
    </div>
  );
};
