import React from 'react';
import { useComicStore } from '../../../stores/comicStore';

interface ProjectSettingsSidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ProjectSettingsSidebar: React.FC<ProjectSettingsSidebarProps> = ({ isOpen, onClose }) => {
    // We will just store prompt settings in local state for this mock, 
    // or expand the comicStore to hold "projectSettings".
    // Since Phase 6 focuses on Mock Generation, let's keep it simple.
    // Ideally it belongs in store. Let's assume store has it or we just add it to window globally for the mock, 
    // but better yet, let's add it to comicStore.

    // For now, let's just use local state and a store update if needed.
    const {
        projectSettings,
        updateProjectSettings
    } = useComicStore();

    return (
        <div
            className={`absolute top-0 right-0 h-full w-80 bg-obsidian-dark border-l border-white/10 shadow-2xl transition-transform duration-300 transform z-30 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
        >
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-obsidian/50 backdrop-blur-md">
                <h2 className="text-white font-bold tracking-wide">PROJECT SETTINGS</h2>
                <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                    ✕
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div>
                    <h3 className="text-white/70 text-sm font-semibold mb-4 uppercase tracking-wider">AI Generation Settings</h3>

                    <div className="flex items-center justify-between mb-4">
                        <label className="text-sm text-white font-medium cursor-pointer" htmlFor="inclusive-toggle">
                            Inclusive Bias / Smart Defaults
                        </label>
                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                            <input
                                type="checkbox"
                                name="toggle"
                                id="inclusive-toggle"
                                checked={projectSettings?.inclusiveBiasEnabled ?? true}
                                onChange={(e) => updateProjectSettings({ inclusiveBiasEnabled: e.target.checked })}
                                className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5 checked:border-gold-500"
                            />
                            <label htmlFor="inclusive-toggle" className="toggle-label block overflow-hidden h-5 rounded-full bg-gray-700 cursor-pointer"></label>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-white/50 uppercase tracking-widest">Demographic Focus (Appended if no specific identity term is found)</label>
                        <textarea
                            value={projectSettings?.demographicFocus || ''}
                            onChange={(e) => updateProjectSettings({ demographicFocus: e.target.value })}
                            className="w-full bg-black/30 border border-white/10 rounded p-2 text-white text-sm focus:border-gold-500 outline-none min-h-[80px]"
                            placeholder="e.g. African-American or Blatino man"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
