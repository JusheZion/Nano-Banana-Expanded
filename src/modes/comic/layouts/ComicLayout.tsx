import React from 'react';

interface ComicLayoutProps {
  children: React.ReactNode;
}

export const ComicLayout: React.FC<ComicLayoutProps> = ({ children }) => {
  return (
    <div className="comic-layout min-h-screen bg-neutral-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
         <header className="mb-8 border-b border-white/10 pb-4">
            <h1 className="text-3xl font-bold font-display text-white">Comic Mode</h1>
         </header>
        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children}
        </main>
      </div>
    </div>
  );
};
