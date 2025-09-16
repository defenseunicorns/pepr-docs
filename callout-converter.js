// Vite plugin to convert GitHub-style callouts to MDX admonitions
export function calloutConverter() {
  return {
    name: 'callout-converter',
    transform(code, id) {
      // Only process markdown files
      if (!id.endsWith('.md') && !id.endsWith('.mdx')) {
        return null;
      }

      // Check if file contains GitHub callouts
      if (!code.includes('> [!')) {
        return null;
      }

      console.log(`Processing callouts in: ${id}`);

      // Convert GitHub-style callouts to MDX admonitions
      let transformedCode = code;

      // Pattern to match the entire callout block
      const calloutPattern = /^> \[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\]\n((?:^>.*\n?)*)/gm;

      transformedCode = transformedCode.replace(calloutPattern, (match, type, content) => {
        const mdxType = type.toLowerCase();

        // Remove the '> ' prefix from each line and clean up
        const cleanContent = content
          .split('\n')
          .map(line => line.replace(/^> ?/, ''))
          .filter(line => line.length > 0)
          .join('\n');

        console.log(`Converting ${type} callout to MDX admonition`);
        return `:::${mdxType}\n${cleanContent}\n:::`;
      });

      // Only return the transformed code if changes were made
      if (transformedCode !== code) {
        console.log('Callout conversion completed');
        return transformedCode;
      }

      return null;
    }
  };
}