import React, { useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { CinematicGallery } from '../components/ui/CinematicGallery';

export const ReferenceAlbum: React.FC = () => {
    const { setTheme } = useTheme();

    useEffect(() => {
        setTheme('purple');
    }, [setTheme]);

    return (
        <div className="min-h-screen text-white pt-20 pb-12">
            <CinematicGallery />
        </div>
    );
};
