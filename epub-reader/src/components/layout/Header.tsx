import React from 'react'

interface HeaderProps {
  // Props will be defined in later tasks
}

export const Header: React.FC<HeaderProps> = () => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <h1 className="text-xl font-semibold">EPUB Reader</h1>
          <nav>
            {/* Navigation will be implemented in later tasks */}
          </nav>
        </div>
      </div>
    </header>
  )
}