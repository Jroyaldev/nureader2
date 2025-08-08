import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Example test to verify testing setup
describe('Testing Setup', () => {
  it('should render a simple component', () => {
    const TestComponent = () => <div>Hello, World!</div>
    
    render(<TestComponent />)
    
    expect(screen.getByText('Hello, World!')).toBeInTheDocument()
  })
})