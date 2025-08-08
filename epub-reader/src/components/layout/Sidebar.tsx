import React from 'react'

interface SidebarProps {
  // Props will be defined in later tasks
}

export const Sidebar: React.FC<SidebarProps> = () => {
  return (
    <aside className="w-64 bg-gray-50 border-r min-h-screen">
      <div className="p-4">
        <h2 className="text-lg font-medium mb-4">Navigation</h2>
        {/* Sidebar content will be implemented in later tasks */}
      </div>
    </aside>
  )
}