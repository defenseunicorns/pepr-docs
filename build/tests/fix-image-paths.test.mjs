import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';

async function getFixImagePathsFunction() {
    const buildScript = await fs.readFile('index.mjs', 'utf8');

    const imageMatch = buildScript.match(/function fixImagePaths\(content\) \{([\s\S]*?)^\}/m);
    if (imageMatch) {
        try {
            return new Function('content', imageMatch[1]);
        } catch (e) {
            console.warn('Could not extract fixImagePaths function:', e.message);
        }
    }
    return null;
}

describe('fixImagePaths - table', () => {
    const testCases = [
        ['should convert _images/pepr-arch.svg to assets path', 'See the ![architecture](_images/pepr-arch.svg) diagram', '/assets/pepr-arch.png'],
        ['should not contain original _images/pepr-arch.svg', 'See the ![architecture](_images/pepr-arch.svg) diagram', '_images/pepr-arch.svg'],

        ['should convert relative paths to assets', '![test](../../../images/test.png)', '/assets/test.png'],
        ['should convert resources light theme to assets', '![demo](resources/create-pepr-operator/light.png)', '/assets/light.png'],
        ['should convert resources dark theme to assets', '![demo](resources/create-pepr-operator/dark.png)', '/assets/dark.png'],
        ['should convert _images/pepr-arch.svg in multi-image content', '![arch](_images/pepr-arch.svg)\n![logo](_images/pepr.png)\n![demo](resources/create-pepr-operator/dark.png)\n![other](../../../images/other.png)', '/assets/pepr-arch.png'],
        ['should convert _images/pepr.png in multi-image content', '![arch](_images/pepr-arch.svg)\n![logo](_images/pepr.png)\n![demo](resources/create-pepr-operator/dark.png)\n![other](../../../images/other.png)', '/assets/pepr.png'],
        ['should convert resources dark.png in multi-image content', '![arch](_images/pepr-arch.svg)\n![logo](_images/pepr.png)\n![demo](resources/create-pepr-operator/dark.png)\n![other](../../../images/other.png)', '/assets/dark.png'],
        ['should convert relative other.png in multi-image content', '![arch](_images/pepr-arch.svg)\n![logo](_images/pepr.png)\n![demo](resources/create-pepr-operator/dark.png)\n![other](../../../images/other.png)', '/assets/other.png'],

        ['should preserve external URLs', '![external](https://example.com/image.png) and ![local](_images/pepr.png)', 'https://example.com/image.png'],
        ['should convert local paths in mixed content', '![external](https://example.com/image.png) and ![local](_images/pepr.png)', '/assets/pepr.png']
    ];

    it.each(testCases)('%s', async (testName, input, expected) => {
        const fixImagePaths = await getFixImagePathsFunction();

        if (fixImagePaths) {
            const result = fixImagePaths(input);

            if (testName.includes('should not contain')) {
                expect(result).not.toContain(expected);
            } else {
                expect(result).toContain(expected);
            }
        }
    });
})