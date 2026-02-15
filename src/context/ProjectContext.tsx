import React, { createContext, useContext, useState, type ReactNode } from 'react';
import type { ChipTag } from '../utils/PromptCompiler';

import TagLibrary from '../data/character_tag_library.json';

interface ProjectContextType {
    tags: ChipTag[];
    setTags: (tags: ChipTag[]) => void;
    dnaLock: boolean;
    setDnaLock: (locked: boolean) => void;
    library: typeof TagLibrary;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tags, setTags] = useState<ChipTag[]>([
        { id: '1', text: 'portrait', polarity: 'positive' },
        { id: '2', text: 'cinematic-lighting', polarity: 'positive' }
    ]);
    const [dnaLock, setDnaLock] = useState(false);

    return (
        <ProjectContext.Provider value={{ tags, setTags, dnaLock, setDnaLock, library: TagLibrary }}>
            {children}
        </ProjectContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useProject = () => {
    const context = useContext(ProjectContext);
    if (!context) {
        throw new Error('useProject must be used within a ProjectProvider');
    }
    return context;
};
