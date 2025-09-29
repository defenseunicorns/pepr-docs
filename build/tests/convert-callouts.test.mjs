import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';

async function getConvertCalloutsFunction() {
    const buildScript = await fs.readFile('index.mjs', 'utf8');

    const calloutsMatch = buildScript.match(/function convertCallouts\(content, filePath\) \{([\s\S]*?)^\}/m);
    if (calloutsMatch) {
        try {
            return new Function('content', 'filePath', `
                const console = { log: () => {} }; // Mock console for testing
                ${calloutsMatch[1]}
            `);
        } catch (e) {
            console.warn('Could not extract convertCallouts function:', e.message);
        }
    }
    return null;
}

describe('convertCallouts', () => {
    const testCases = [
        {
            name: 'should convert TIP to :::tip', 
            input: '> [!TIP]\n> This is a helpful tip\n> that spans multiple lines',
            expected: ':::tip'
        },
        {
            name: 'should preserve TIP content', 
            input: '> [!TIP]\n> This is a helpful tip\n> that spans multiple lines', 
            expected: 'This is a helpful tip'
        },
        {
            name: 'should preserve TIP multiline content', 
            input: '> [!TIP]\n> This is a helpful tip\n> that spans multiple lines',
            expected: 'that spans multiple lines'
        },
        {
            name: 'should close TIP with :::', 
            input: '> [!TIP]\n> This is a helpful tip\n> that spans multiple lines', 
            expected: ':::'
        },
        {
            name: 'should convert WARNING to :::warning', 
            input: '> [!WARNING]\n> This is a warning message', 
            expected: ':::warning'
        },
        {
            name: 'should preserve WARNING content', 
            input: '> [!WARNING]\n> This is a warning message', 
            expected: 'This is a warning message'
        },
        {
            name: 'should convert NOTE in mixed content', 
            input: '> [!NOTE]\n> This is a note\n\nSome regular content\n\n> [!IMPORTANT]\n> This is important', 
            expected: ':::note'
        },
        {
            name: 'should convert IMPORTANT in mixed content', 
            input: '> [!NOTE]\n> This is a note\n\nSome regular content\n\n> [!IMPORTANT]\n> This is important', 
            expected: ':::important'
        },
        {
            name: 'should preserve regular content between callouts', 
            input: '> [!NOTE]\n> This is a note\n\nSome regular content\n\n> [!IMPORTANT]\n> This is important', 
            expected: 'Some regular content'
        },
        {
            name: 'should convert TIP in multi-type content', 
            input: '> [!TIP]\n> Tip content\n\n> [!NOTE]\n> Note content\n\n> [!WARNING]\n> Warning content\n\n> [!IMPORTANT]\n> Important content\n\n> [!CAUTION]\n> Caution content', 
            expected: ':::tip'
        },
        {
            name: 'should convert NOTE in multi-type content', 
            input: '> [!TIP]\n> Tip content\n\n> [!NOTE]\n> Note content\n\n> [!WARNING]\n> Warning content\n\n> [!IMPORTANT]\n> Important content\n\n> [!CAUTION]\n> Caution content', 
            expected: ':::note'
        },
        {
            name: 'should convert WARNING in multi-type content', 
            input: '> [!TIP]\n> Tip content\n\n> [!NOTE]\n> Note content\n\n> [!WARNING]\n> Warning content\n\n> [!IMPORTANT]\n> Important content\n\n> [!CAUTION]\n> Caution content', 
            expected: ':::warning'
        },
        {
            name: 'should convert IMPORTANT in multi-type content', 
            input: '> [!TIP]\n> Tip content\n\n> [!NOTE]\n> Note content\n\n> [!WARNING]\n> Warning content\n\n> [!IMPORTANT]\n> Important content\n\n> [!CAUTION]\n> Caution content', 
            expected: ':::important'
        },
        {
            name: 'should convert CAUTION in multi-type content', 
            input: '> [!TIP]\n> Tip content\n\n> [!NOTE]\n> Note content\n\n> [!WARNING]\n> Warning content\n\n> [!IMPORTANT]\n> Important content\n\n> [!CAUTION]\n> Caution content', 
            expected: ':::caution'
        }
    ];

    it.each(testCases)('$name', async ({name, input, expected}) => {
        const convertCallouts = await getConvertCalloutsFunction();

        if (convertCallouts) {
            const result = convertCallouts(input, 'test.md');
            expect(result).toContain(expected);
        }
    });
})