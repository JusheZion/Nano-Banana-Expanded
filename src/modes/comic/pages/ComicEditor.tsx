import React from 'react';
import { ComicLayout } from '../layouts/ComicLayout';
import { ComicPanel } from '../components/ComicPanel';

export const ComicEditor: React.FC = () => {
    return (
        <ComicLayout>
            <ComicPanel panelNumber={1} caption="The journey begins..." />
            <ComicPanel panelNumber={2} />
            <ComicPanel panelNumber={3} />
            <div className="flex items-center justify-center aspect-[2/3] border-2 border-dashed border-white/20 rounded-sm hover:border-crimson-500/50 transition-colors cursor-pointer group">
                <span className="text-white/50 group-hover:text-crimson-400 font-display text-lg">+ Add Panel</span>
            </div>
        </ComicLayout>
    );
};
