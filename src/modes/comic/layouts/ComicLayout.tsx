import React from 'react';

interface ComicLayoutProps {
  children: React.ReactNode;
}

export const ComicLayout: React.FC<ComicLayoutProps> = ({ children }) => {
  return (
    <div className="comic-layout min-h-screen bg-obsidian text-white relative overflow-hidden">
      {/* Ambient Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-900/40 via-purple-900/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-teal-900/20 blur-[100px] rounded-full pointer-events-none" />

      <div className="max-w-screen-2xl mx-auto h-screen flex flex-col">
        <header className="px-8 py-6 border-b border-white/5 backdrop-blur-sidebar bg-obsidian/50 z-10 flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-4">
            <div className="w-2 h-8 bg-gradient-to-b from-gold-300 to-gold-500 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
            <h1 className="text-2xl font-bold font-display tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70">
              COMIC MODE
            </h1>
          </div>
          {/* Placeholder for toolbar actions */}
          <div className="flex gap-4">
            <button className="px-4 py-2 rounded-be-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all font-medium text-sm backdrop-blur-sm">
              Export
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
    </div>
  );
};
