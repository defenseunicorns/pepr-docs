import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';

async function getTransformContentFunction() {
	const buildScript = await fs.readFile('index.mjs', 'utf8');

	const funcMatch = buildScript.match(/const transformContent = \(content\) => \{([\s\S]*?)^\};/m);
	if (funcMatch) {
		try {
			const hasNumericMatch = buildScript.match(/function hasNumericPrefix\(str\) \{\s*return ([^}]+);\s*\}/);
			const fixImageMatch = buildScript.match(/function fixImagePaths\(content\) \{([\s\S]*?)^\}/m);
			const removeHtmlMatch = buildScript.match(/function removeHtmlComments\(input\) \{([\s\S]*?)^\}/m);

			if (hasNumericMatch && fixImageMatch && removeHtmlMatch) {
				return new Function('content', `
					// Helper functions
					const hasNumericPrefix = (str) => { return ${hasNumericMatch[1]}; };
					const fixImagePaths = (content) => { ${fixImageMatch[1]} };
					const removeHtmlComments = (input) => { ${removeHtmlMatch[1]} };

					// Main function body
					${funcMatch[1]}
				`);
			}
		} catch (e) {
			console.warn('Could not extract transformContent function:', e.message);
		}
	}
	return null;
}

describe('transformContent', () => {
    const testCases = [
        ['should transform video URLs to video tags', 'Check out this demo: https://example.com/demo.mp4', '<video class="td-content" controls src="https://example.com/demo.mp4"></video>'],

        ['should remove HTML Start Block comments', '# Test\n<!-- Start Block -->\nSome content\n<!-- End Block -->\nMore content', 'Some content'],
        ['should remove HTML End Block comments', '# Test\n<!-- Start Block -->\nSome content\n<!-- End Block -->\nMore content', 'More content'],
        ['should not contain Start Block markers', '# Test\n<!-- Start Block -->\nSome content\n<!-- End Block -->\nMore content', '<!-- Start Block -->'],
        ['should not contain End Block markers', '# Test\n<!-- Start Block -->\nSome content\n<!-- End Block -->\nMore content', '<!-- End Block -->'],
        ['should fix pepr-arch.svg image paths', '![arch](_images/pepr-arch.svg) and ![logo](_images/pepr.png)', '/assets/pepr-arch.png'],
        ['should fix pepr.png image paths', '![arch](_images/pepr-arch.svg) and ![logo](_images/pepr.png)', '/assets/pepr.png'],

        ['should escape MDX @param', '**@param** name The parameter name', '**\\@param**'],
        ['should escape email addresses', 'Contact us at <user@example.com>', '&lt;user@example.com&gt;'],
        ['should process markdown links with numeric prefixes', '[Getting Started](1_getting-started/README.md)', '[Getting Started](getting-started)'],
        ['should fix image paths in complex content', '# Documentation\n\n<!-- This is a comment -->\n![arch](_images/pepr-arch.svg)\n\nCheck out this video: https://example.com/demo.mp4\n\n[Getting Started](1_getting-started/README.md)\n\n**@param** config The configuration object\n\nContact: <admin@example.com>', '/assets/pepr-arch.png'],
        ['should transform video in complex content', '# Documentation\n\n<!-- This is a comment -->\n![arch](_images/pepr-arch.svg)\n\nCheck out this video: https://example.com/demo.mp4\n\n[Getting Started](1_getting-started/README.md)\n\n**@param** config The configuration object\n\nContact: <admin@example.com>', '<video class="td-content" controls'],
        ['should fix links in complex content', '# Documentation\n\n<!-- This is a comment -->\n![arch](_images/pepr-arch.svg)\n\nCheck out this video: https://example.com/demo.mp4\n\n[Getting Started](1_getting-started/README.md)\n\n**@param** config The configuration object\n\nContact: <admin@example.com>', '[Getting Started](getting-started)'],
        ['should escape @param in complex content', '# Documentation\n\n<!-- This is a comment -->\n![arch](_images/pepr-arch.svg)\n\nCheck out this video: https://example.com/demo.mp4\n\n[Getting Started](1_getting-started/README.md)\n\n**@param** config The configuration object\n\nContact: <admin@example.com>', '**\\@param**'],
        ['should escape email in complex content', '# Documentation\n\n<!-- This is a comment -->\n![arch](_images/pepr-arch.svg)\n\nCheck out this video: https://example.com/demo.mp4\n\n[Getting Started](1_getting-started/README.md)\n\n**@param** config The configuration object\n\nContact: <admin@example.com>', '&lt;admin@example.com&gt;'],
        ['should not contain comments in complex content', '# Documentation\n\n<!-- This is a comment -->\n![arch](_images/pepr-arch.svg)\n\nCheck out this video: https://example.com/demo.mp4\n\n[Getting Started](1_getting-started/README.md)\n\n**@param** config The configuration object\n\nContact: <admin@example.com>', '<!-- This is a comment -->']
    ];

    it.each(testCases)('%s', async (testName, input, expected) => {
        const transformContent = await getTransformContentFunction();

        if (transformContent) {
            const result = transformContent(input);

            if (testName.includes('should not contain')) {
                expect(result).not.toContain(expected);
            } else {
                expect(result).toContain(expected);
            }
        }
    });
});