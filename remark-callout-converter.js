// Simple remark plugin to convert GitHub-style callouts to MDX admonitions
export function remarkCalloutConverter() {
  return (tree, file) => {
    // Get the raw markdown content
    const content = file.value;

    if (typeof content === 'string' && content.includes('> [!')) {
      console.log(`Processing callouts in: ${file.path || 'unknown'}`);

      // Convert GitHub-style callouts to MDX admonitions
      const convertedContent = content.replace(
        /^> \[!(TIP|NOTE|WARNING|IMPORTANT|CAUTION)\]\n((?:^>.*\n?)*)/gm,
        (match, type, content) => {
          const mdxType = type.toLowerCase();

          // Remove the '> ' prefix from each line and clean up
          const cleanContent = content
            .split('\n')
            .map(line => line.replace(/^> ?/, ''))
            .filter(line => line.length > 0)
            .join('\n');

          console.log(`Converting ${type} callout to MDX admonition`);
          return `:::${mdxType}\n${cleanContent}\n:::`;
        }
      );

      // Update the file content if changes were made
      if (convertedContent !== content) {
        file.value = convertedContent;
        console.log('Callout conversion completed');
      }
    }
  };
}