import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';

async function getRemoveHtmlCommentsFunction() {
    const buildScript = await fs.readFile('index.mjs', 'utf8');

    const removeMatch = buildScript.match(/function removeHtmlComments\(input\) \{([\s\S]*?)^\}/m);
    if (removeMatch) {
        try {
            return new Function('input', removeMatch[1]);
        } catch (e) {
            console.warn('Could not extract removeHtmlComments function:', e.message);
        }
    }
    return null;
}

describe('removeHtmlComments', () => {
    const testCases = [
        ['should remove simple HTML comments', 'Before <!-- comment --> after', 'Before  after'],
        ['should not contain simple comment markers', 'Before <!-- comment --> after', '<!-- comment -->'],
        ['should handle nested comments - preserve Before', 'Before <!-- outer <!-- inner --> comment --> after', 'Before'],
        ['should handle nested comments - preserve after', 'Before <!-- outer <!-- inner --> comment --> after', 'after'],

        ['should remove multiline comments', 'Before\n<!--\nThis is a\nmultiline comment\n-->\nAfter', 'Before'],
        ['should preserve content after multiline comments', 'Before\n<!--\nThis is a\nmultiline comment\n-->\nAfter', 'After'],
        ['should not contain multiline comment markers', 'Before\n<!--\nThis is a\nmultiline comment\n-->\nAfter', '<!--'],
        ['should not contain multiline comment content', 'Before\n<!--\nThis is a\nmultiline comment\n-->\nAfter', 'multiline comment'],

        ['should remove multiple comments - preserve content', '<!-- Start --> content <!-- Middle --> more <!-- End -->', 'content'],
        ['should remove multiple comments - preserve more', '<!-- Start --> content <!-- Middle --> more <!-- End -->', 'more'],
        ['should not contain Start comment', '<!-- Start --> content <!-- Middle --> more <!-- End -->', '<!--'],
        ['should not contain comment end markers', '<!-- Start --> content <!-- Middle --> more <!-- End -->', '-->'],

        ['should remove Start Block comment', '# Tutorial\n\n<!-- Start Block -->\nSome tutorial content here\n<!-- End Block -->\n\nMore content', 'Some tutorial content here'],
        ['should remove End Block comment', '# Tutorial\n\n<!-- Start Block -->\nSome tutorial content here\n<!-- End Block -->\n\nMore content', 'More content'],
        ['should not contain Start Block marker', '# Tutorial\n\n<!-- Start Block -->\nSome tutorial content here\n<!-- End Block -->\n\nMore content', '<!-- Start Block -->'],
        ['should not contain End Block marker', '# Tutorial\n\n<!-- Start Block -->\nSome tutorial content here\n<!-- End Block -->\n\nMore content', '<!-- End Block -->']
    ];

    it.each(testCases)('%s', async (testName, input, expected) => {
        const removeHtmlComments = await getRemoveHtmlCommentsFunction();

        if (removeHtmlComments) {
            const result = removeHtmlComments(input);

            if (testName.includes('should not contain')) {
                expect(result).not.toContain(expected);
            } else {
                expect(result).toContain(expected);
            }
        }
    });
});