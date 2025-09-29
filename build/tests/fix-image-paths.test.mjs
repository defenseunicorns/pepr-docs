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
        {
            name: 'should convert _images/pepr-arch.svg to assets path', 
            input: 'See the ![architecture](_images/pepr-arch.svg) diagram', 
            expected: '/assets/pepr-arch.png'
        },
        {
            name: 'should not contain original _images/pepr-arch.svg', 
            input: 'See the ![architecture](_images/pepr-arch.svg) diagram', 
            expected: '_images/pepr-arch.svg'
        },
        {
            name: 'should convert relative paths to assets',
            input: '![test](../../../images/test.png)',
            expected: '/assets/test.png'
        },
        {
            name: 'should convert resources light theme to assets',
            input: '![demo](resources/create-pepr-operator/light.png)',
            expected: '/assets/light.png'
        },
        {
            name: 'should convert resources dark theme to assets',
            input: '![demo](resources/create-pepr-operator/dark.png)',
            expected: '/assets/dark.png'
        },
        {
            name: 'should convert _images/pepr-arch.svg in multi-image content',
            input: '![arch](_images/pepr-arch.svg)\n![logo](_images/pepr.png)\n![demo](resources/create-pepr-operator/dark.png)\n![other](../../../images/other.png)',
            expected: '/assets/pepr-arch.png'
        },
        {
            name: 'should convert _images/pepr.png in multi-image content',
            input: '![arch](_images/pepr-arch.svg)\n![logo](_images/pepr.png)\n![demo](resources/create-pepr-operator/dark.png)\n![other](../../../images/other.png)',
            expected: '/assets/pepr.png'
        },
        {
            name: 'should convert resources dark.png in multi-image content',
            input: '![arch](_images/pepr-arch.svg)\n![logo](_images/pepr.png)\n![demo](resources/create-pepr-operator/dark.png)\n![other](../../../images/other.png)',
            expected: '/assets/dark.png'
        },
        {
            name: 'should convert relative other.png in multi-image content',
            input: '![arch](_images/pepr-arch.svg)\n![logo](_images/pepr.png)\n![demo](resources/create-pepr-operator/dark.png)\n![other](../../../images/other.png)',
            expected: '/assets/other.png'
        },
        {
            name: 'should preserve external URLs',
            input: '![external](https://example.com/image.png) and ![local](_images/pepr.png)',
            expected: 'https://example.com/image.png'
        },
        {
            name: 'should convert local paths in mixed content',
            input: '![external](https://example.com/image.png) and ![local](_images/pepr.png)',
            expected: '/assets/pepr.png'
        }
    ];

    it.each(testCases)('$name', async ({ name, input, expected }) => {
        const fixImagePaths = await getFixImagePathsFunction();

        if (fixImagePaths) {
            const result = fixImagePaths(input);

            if (name.includes('should not contain')) {
                expect(result).not.toContain(expected);
            } else {
                expect(result).toContain(expected);
            }
        }
    });
});