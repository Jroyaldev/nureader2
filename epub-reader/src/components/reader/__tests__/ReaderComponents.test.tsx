import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ContextualToolbar from '../ContextualToolbar';
import { FloatingSelectionToolbar, AnnotationPanel } from '../EnhancedAnnotationSystem';
import { ReadingSettingsPanel } from '../ReadingSettingsPanel';

// Mock functions
const mockOnNavigateHome = jest.fn();
const mockOnNavigatePrev = jest.fn();
const mockOnNavigateNext = jest.fn();
const mockOnThemeChange = jest.fn();
const mockOnFontSizeChange = jest.fn();
const mockOnToggleToc = jest.fn();
const mockOnToggleAnnotations = jest.fn();
const mockOnToggleSettings = jest.fn();
const mockOnToggleSearch = jest.fn();
const mockOnToggleBookmark = jest.fn();
const mockOnToggleFullscreen = jest.fn();
const mockOnHighlight = jest.fn();
const mockOnNote = jest.fn();
const mockOnCopy = jest.fn();
const mockOnShare = jest.fn();
const mockOnClose = jest.fn();
const mockOnAnnotationClick = jest.fn();
const mockOnAnnotationEdit = jest.fn();
const mockOnAnnotationDelete = jest.fn();
const mockOnExport = jest.fn();
const mockOnSettingsChange = jest.fn();
const mockOnReset = jest.fn();

describe('ContextualToolbar', () => {
  const defaultProps = {
    onNavigateHome: mockOnNavigateHome,
    onNavigatePrev: mockOnNavigatePrev,
    onNavigateNext: mockOnNavigateNext,
    canGoNext: true,
    canGoPrev: true,
    currentTheme: 'light' as const,
    onThemeChange: mockOnThemeChange,
    fontSize: 16,
    onFontSizeChange: mockOnFontSizeChange,
    showToc: false,
    showAnnotations: false,
    showSettings: false,
    showSearch: false,
    onToggleToc: mockOnToggleToc,
    onToggleAnnotations: mockOnToggleAnnotations,
    onToggleSettings: mockOnToggleSettings,
    onToggleSearch: mockOnToggleSearch,
    progress: 45,
    chapterTitle: 'Chapter 1: Introduction',
    timeLeft: '2h 30m',
    isBookmarked: false,
    onToggleBookmark: mockOnToggleBookmark,
    isFullscreen: false,
    onToggleFullscreen: mockOnToggleFullscreen,
    isVisible: true,
    autoHide: false,
    isMobile: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders desktop toolbar with all controls', () => {
    render(<ContextualToolbar {...defaultProps} />);
    
    expect(screen.getByLabelText('Library')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous')).toBeInTheDocument();
    expect(screen.getByLabelText('Next')).toBeInTheDocument();
    expect(screen.getByText('Chapter 1: Introduction')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('2h 30m left')).toBeInTheDocument();
  });

  it('renders mobile toolbar with bottom sheet', () => {
    render(<ContextualToolbar {...defaultProps} isMobile={true} />);
    
    expect(screen.getByLabelText('Library')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
  });

  it('handles navigation clicks', () => {
    render(<ContextualToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByLabelText('Library'));
    expect(mockOnNavigateHome).toHaveBeenCalledTimes(1);
    
    fireEvent.click(screen.getByLabelText('Previous'));
    expect(mockOnNavigatePrev).toHaveBeenCalledTimes(1);
    
    fireEvent.click(screen.getByLabelText('Next'));
    expect(mockOnNavigateNext).toHaveBeenCalledTimes(1);
  });

  it('disables navigation buttons when appropriate', () => {
    render(<ContextualToolbar {...defaultProps} canGoPrev={false} canGoNext={false} />);
    
    expect(screen.getByLabelText('Previous')).toBeDisabled();
    expect(screen.getByLabelText('Next')).toBeDisabled();
  });

  it('handles font size adjustments', () => {
    render(<ContextualToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByLabelText('Decrease font'));
    expect(mockOnFontSizeChange).toHaveBeenCalledWith(14);
    
    fireEvent.click(screen.getByLabelText('Increase font'));
    expect(mockOnFontSizeChange).toHaveBeenCalledWith(18);
  });

  it('toggles bookmark state', () => {
    const { rerender } = render(<ContextualToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByLabelText('Bookmark'));
    expect(mockOnToggleBookmark).toHaveBeenCalledTimes(1);
    
    rerender(<ContextualToolbar {...defaultProps} isBookmarked={true} />);
    expect(screen.getByLabelText('Bookmark')).toBeInTheDocument();
  });
});

describe('FloatingSelectionToolbar', () => {
  const defaultProps = {
    visible: true,
    position: { x: 100, y: 100 },
    selectedText: 'Selected text for testing',
    onHighlight: mockOnHighlight,
    onNote: mockOnNote,
    onCopy: mockOnCopy,
    onShare: mockOnShare,
    onClose: mockOnClose
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when visible', () => {
    render(<FloatingSelectionToolbar {...defaultProps} />);
    
    expect(screen.getByText('"Selected text for testing"')).toBeInTheDocument();
    expect(screen.getByLabelText('Highlight')).toBeInTheDocument();
    expect(screen.getByLabelText('Add Note')).toBeInTheDocument();
    expect(screen.getByLabelText('Copy')).toBeInTheDocument();
    expect(screen.getByLabelText('Share')).toBeInTheDocument();
  });

  it('does not render when not visible', () => {
    render(<FloatingSelectionToolbar {...defaultProps} visible={false} />);
    
    expect(screen.queryByText('"Selected text for testing"')).not.toBeInTheDocument();
  });

  it('shows color picker on highlight button click', () => {
    render(<FloatingSelectionToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByLabelText('Highlight'));
    
    expect(screen.getByLabelText('Highlight Yellow')).toBeInTheDocument();
    expect(screen.getByLabelText('Highlight Green')).toBeInTheDocument();
    expect(screen.getByLabelText('Highlight Blue')).toBeInTheDocument();
  });

  it('handles highlight color selection', () => {
    render(<FloatingSelectionToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByLabelText('Highlight'));
    fireEvent.click(screen.getByLabelText('Highlight Yellow'));
    
    expect(mockOnHighlight).toHaveBeenCalledWith('#fbbf24');
  });

  it('handles copy action', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined)
      }
    });
    
    render(<FloatingSelectionToolbar {...defaultProps} />);
    
    fireEvent.click(screen.getByLabelText('Copy'));
    
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Selected text for testing');
      expect(mockOnCopy).toHaveBeenCalled();
    });
  });
});

describe('AnnotationPanel', () => {
  const mockAnnotations = [
    {
      id: '1',
      bookId: 'book1',
      userId: 'user1',
      type: 'highlight' as const,
      color: '#fbbf24',
      text: 'This is a highlighted text',
      cfiRange: 'cfi1',
      chapter: 'Chapter 1',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01')
    },
    {
      id: '2',
      bookId: 'book1',
      userId: 'user1',
      type: 'note' as const,
      color: '#34d399',
      text: 'Text with a note',
      note: 'This is my note',
      cfiRange: 'cfi2',
      chapter: 'Chapter 2',
      tags: ['important', 'review'],
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02')
    }
  ];

  const defaultProps = {
    visible: true,
    annotations: mockAnnotations,
    onClose: mockOnClose,
    onAnnotationClick: mockOnAnnotationClick,
    onAnnotationEdit: mockOnAnnotationEdit,
    onAnnotationDelete: mockOnAnnotationDelete,
    onExport: mockOnExport
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders annotation panel with annotations', () => {
    render(<AnnotationPanel {...defaultProps} />);
    
    expect(screen.getByText('Annotations')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
    expect(screen.getByText('"This is a highlighted text"')).toBeInTheDocument();
    expect(screen.getByText('This is my note')).toBeInTheDocument();
  });

  it('filters annotations by type', () => {
    render(<AnnotationPanel {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Highlight'));
    
    expect(screen.getByText('"This is a highlighted text"')).toBeInTheDocument();
    expect(screen.queryByText('This is my note')).not.toBeInTheDocument();
  });

  it('searches annotations', () => {
    render(<AnnotationPanel {...defaultProps} />);
    
    const searchInput = screen.getByPlaceholderText('Search annotations...');
    fireEvent.change(searchInput, { target: { value: 'note' } });
    
    expect(screen.queryByText('"This is a highlighted text"')).not.toBeInTheDocument();
    expect(screen.getByText('This is my note')).toBeInTheDocument();
  });

  it('handles annotation click', () => {
    render(<AnnotationPanel {...defaultProps} />);
    
    fireEvent.click(screen.getByText('"This is a highlighted text"'));
    
    expect(mockOnAnnotationClick).toHaveBeenCalledWith(mockAnnotations[0]);
  });

  it('handles export button click', () => {
    render(<AnnotationPanel {...defaultProps} />);
    
    fireEvent.click(screen.getByLabelText('Export'));
    
    expect(mockOnExport).toHaveBeenCalledTimes(1);
  });
});

describe('ReadingSettingsPanel', () => {
  const defaultSettings = {
    fontSize: 16,
    fontFamily: 'Georgia, serif',
    lineHeight: 1.6,
    letterSpacing: 0,
    wordSpacing: 0,
    textAlign: 'justify' as const,
    hyphenation: false,
    marginHorizontal: 60,
    marginVertical: 40,
    columnCount: 1 as const,
    columnGap: 30,
    maxWidth: 0,
    scrollMode: 'paginated' as const,
    theme: 'light' as const,
    brightness: 100,
    contrast: 100,
    hidePageNumbers: false,
    hideChapterTitles: false,
    autoHideToolbar: true,
    smoothScrolling: true,
    pageTransition: 'fade' as const,
    readingSpeed: 250
  };

  const defaultProps = {
    visible: true,
    settings: defaultSettings,
    onSettingsChange: mockOnSettingsChange,
    onClose: mockOnClose,
    onReset: mockOnReset
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders settings panel with all tabs', () => {
    render(<ReadingSettingsPanel {...defaultProps} />);
    
    expect(screen.getByText('Reading Settings')).toBeInTheDocument();
    expect(screen.getByText('Typography')).toBeInTheDocument();
    expect(screen.getByText('Layout')).toBeInTheDocument();
    expect(screen.getByText('Theme')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('applies presets', () => {
    render(<ReadingSettingsPanel {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Comfortable'));
    
    expect(mockOnSettingsChange).toHaveBeenCalledWith({
      fontSize: 18,
      lineHeight: 1.8,
      marginHorizontal: 60,
      columnCount: 1
    });
  });

  it('changes font size with slider', () => {
    render(<ReadingSettingsPanel {...defaultProps} />);
    
    const sliders = screen.getAllByRole('slider');
    const fontSizeSlider = sliders[0]; // First slider is font size
    fireEvent.change(fontSizeSlider, { target: { value: '20' } });
    
    expect(mockOnSettingsChange).toHaveBeenCalledWith({ fontSize: 20 });
  });

  it('switches between tabs', () => {
    render(<ReadingSettingsPanel {...defaultProps} />);
    
    fireEvent.click(screen.getByText('Layout'));
    expect(screen.getByText('Side Margins')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Theme'));
    expect(screen.getByText('Reading Theme')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Advanced'));
    expect(screen.getByText('Reading Speed')).toBeInTheDocument();
  });

  it('handles reset button', () => {
    render(<ReadingSettingsPanel {...defaultProps} />);
    
    fireEvent.click(screen.getByLabelText('Reset'));
    
    expect(mockOnReset).toHaveBeenCalledTimes(1);
  });

  it('handles close button', () => {
    render(<ReadingSettingsPanel {...defaultProps} />);
    
    fireEvent.click(screen.getByLabelText('Close'));
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});