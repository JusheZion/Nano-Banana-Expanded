import React from 'react';
import { ComicLayout } from '../layouts/ComicLayout';
import { ComicCanvas } from '../engine/ComicCanvas';

export const ComicEditor: React.FC = () => {
    return (
        <ComicLayout>
            <ComicCanvas />
        </ComicLayout>
    );
};
