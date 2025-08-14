import { EpubRenderer } from './epub-renderer';

describe('EpubRenderer', () => {
  let renderer: EpubRenderer;
  let container: HTMLDivElement;
  let onChapterChangeCallback: jest.Mock;

  beforeEach(() => {
    // 1. Set up the DOM
    document.body.innerHTML = '<div id="viewer"></div>';
    container = document.getElementById('viewer') as HTMLDivElement;

    // Mock container properties
    Object.defineProperty(container, 'clientHeight', { value: 800 });
    Object.defineProperty(container, 'scrollHeight', { value: 10000 });

    // 2. Create renderer instance
    renderer = new EpubRenderer(container);
    onChapterChangeCallback = jest.fn();
    renderer.onChapterChange(onChapterChangeCallback);

    // 3. Mock internal properties of the renderer
    const mockChapters = [
      { id: 'c1', href: 'c1.xhtml', title: 'Chapter 1', index: 0, content: '' },
      { id: 'c2', href: 'c2.xhtml', title: 'Chapter 2', index: 1, content: '' },
      { id: 'c3', href: 'c3.xhtml', title: 'Chapter 3', index: 2, content: '' },
      { id: 'c4', href: 'c4.xhtml', title: 'Chapter 4', index: 3, content: '' },
    ];

    const mockToc = [
      { label: 'Chapter 1', href: 'c1.xhtml' },
      { label: 'Chapter 2', href: 'c2.xhtml' },
      { label: 'Chapter 3', href: 'c3.xhtml' },
      { label: 'Chapter 4', href: 'c4.xhtml' },
    ];

    // Use 'any' to access private properties for testing
    (renderer as any).chapters = mockChapters;
    (renderer as any).toc = mockToc;

    // 4. Create mock chapter elements in the container
    container.innerHTML = `
      <div class="epub-chapter" data-chapter-index="0" data-chapter-href="c1.xhtml" style="height: 2000px;"></div>
      <div class="chapter-separator" style="height: 200px;"></div>
      <div class="epub-chapter" data-chapter-index="1" data-chapter-href="c2.xhtml" style="height: 2000px;"></div>
      <div class="chapter-separator" style="height: 200px;"></div>
      <div class="epub-chapter" data-chapter-index="2" data-chapter-href="c3.xhtml" style="height: 2000px;"></div>
      <div class="chapter-separator" style="height: 200px;"></div>
      <div class="epub-chapter" data-chapter-index="3" data-chapter-href="c4.xhtml" style="height: 2000px;"></div>
    `;

    // Mock getBoundingClientRect for each chapter
    const chapterElements = container.querySelectorAll('.epub-chapter');
    chapterElements.forEach((el, i) => {
      const chapterTop = i * 2200; // 2000px height + 200px separator
      jest.spyOn(el, 'getBoundingClientRect').mockImplementation(() => ({
        top: chapterTop - container.scrollTop,
        bottom: chapterTop + 2000 - container.scrollTop,
        height: 2000,
        left: 0,
        right: 800,
        x: 0,
        y: chapterTop - container.scrollTop,
        toJSON: () => ({}),
      }));
    });
  });

  // Helper to call the private method
  const updateCurrentChapter = () => {
    (renderer as any).updateCurrentChapter();
  };

  it('should identify the first chapter when scrolled to the top', () => {
    container.scrollTop = 0;
    updateCurrentChapter();
    expect(onChapterChangeCallback).toHaveBeenCalledWith('Chapter 1');
  });

  it('should identify the first chapter when scrolled into it', () => {
    container.scrollTop = 1000; // Middle of Chapter 1
    updateCurrentChapter();
    expect(onChapterChangeCallback).toHaveBeenCalledWith('Chapter 1');
  });

  it('should still identify the first chapter when scrolled near its end', () => {
    container.scrollTop = 1900; // Near the end of Chapter 1
    updateCurrentChapter();
    expect(onChapterChangeCallback).toHaveBeenCalledWith('Chapter 1');
  });

  it('should identify the first chapter when scrolled into the separator after it', () => {
    // The reference point is at scrollTop + 200 (800 * 0.25)
    // Chapter 2 starts at 2200.
    // If we scroll to 2100, the reference point is 2300, which is in chapter 2.
    // The logic is "last chapter that has started", so if we are in the separator, the previous chapter should be active.
    container.scrollTop = 2100; // In the separator between Ch1 and Ch2
    updateCurrentChapter();
    expect(onChapterChangeCallback).toHaveBeenCalledWith('Chapter 1');
  });

  it('should identify the second chapter when scrolled to its beginning', () => {
    container.scrollTop = 2200; // Start of Chapter 2
    updateCurrentChapter();
    expect(onChapterChangeCallback).toHaveBeenCalledWith('Chapter 2');
  });

  it('should identify the second chapter when scrolled into its middle', () => {
    container.scrollTop = 3200; // Middle of Chapter 2
    updateCurrentChapter();
    expect(onChapterChangeCallback).toHaveBeenCalledWith('Chapter 2');
  });

  it('should identify the last chapter correctly', () => {
    container.scrollTop = 7000; // Middle of Chapter 4
    updateCurrentChapter();
    expect(onChapterChangeCallback).toHaveBeenCalledWith('Chapter 4');
  });

  it('should handle scrolling before the first chapter', () => {
    // This case is handled by the `scrollTop < 100` check in the implementation
    container.scrollTop = 50;
    updateCurrentChapter();
    expect(onChapterChangeCallback).toHaveBeenCalledWith('Chapter 1');
  });
});
