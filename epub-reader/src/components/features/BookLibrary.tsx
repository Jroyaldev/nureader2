import React from 'react'

interface BookLibraryProps {
  // Props will be defined in later tasks
}

export const BookLibrary: React.FC<BookLibraryProps> = () => {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Book Library</h2>
      <p className="text-gray-600">Library component will be implemented in later tasks.</p>
    </div>
  )
}