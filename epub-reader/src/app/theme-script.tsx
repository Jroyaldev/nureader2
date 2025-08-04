export function ThemeScript() {
  const script = `
    (function() {
      try {
        // Get saved theme or default to light
        const savedTheme = localStorage.getItem('resolvedTheme') || 'light';
        const savedUserTheme = localStorage.getItem('theme') || 'system';
        
        // Apply theme class
        document.documentElement.classList.add(savedTheme);
        document.documentElement.setAttribute('data-theme', savedTheme);
        
        // Set body background immediately
        document.body.style.backgroundColor = savedTheme === 'dark' ? '#101215' : '#fcfcfd';
        
        // If user preference is system, check current system theme
        if (savedUserTheme === 'system' && window.matchMedia) {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          const systemTheme = prefersDark ? 'dark' : 'light';
          if (systemTheme !== savedTheme) {
            document.documentElement.classList.remove(savedTheme);
            document.documentElement.classList.add(systemTheme);
            document.documentElement.setAttribute('data-theme', systemTheme);
            document.body.style.backgroundColor = systemTheme === 'dark' ? '#101215' : '#fcfcfd';
          }
        }
      } catch (e) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}