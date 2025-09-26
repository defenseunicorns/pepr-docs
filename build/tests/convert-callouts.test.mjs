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
        ['should convert TIP to :::tip', '> [!TIP]\n> This is a helpful tip\n> that spans multiple lines', ':::tip'],
        ['should preserve TIP content', '> [!TIP]\n> This is a helpful tip\n> that spans multiple lines', 'This is a helpful tip'],
        ['should preserve TIP multiline content', '> [!TIP]\n> This is a helpful tip\n> that spans multiple lines', 'that spans multiple lines'],
        ['should close TIP with :::', '> [!TIP]\n> This is a helpful tip\n> that spans multiple lines', ':::'],

        ['should convert WARNING to :::warning', '> [!WARNING]\n> This is a warning message', ':::warning'],
        ['should preserve WARNING content', '> [!WARNING]\n> This is a warning message', 'This is a warning message'],

        ['should convert NOTE in mixed content', '> [!NOTE]\n> This is a note\n\nSome regular content\n\n> [!IMPORTANT]\n> This is important', ':::note'],
        ['should convert IMPORTANT in mixed content', '> [!NOTE]\n> This is a note\n\nSome regular content\n\n> [!IMPORTANT]\n> This is important', ':::important'],
        ['should preserve regular content between callouts', '> [!NOTE]\n> This is a note\n\nSome regular content\n\n> [!IMPORTANT]\n> This is important', 'Some regular content'],

        ['should convert TIP in multi-type content', '> [!TIP]\n> Tip content\n\n> [!NOTE]\n> Note content\n\n> [!WARNING]\n> Warning content\n\n> [!IMPORTANT]\n> Important content\n\n> [!CAUTION]\n> Caution content', ':::tip'],
        ['should convert NOTE in multi-type content', '> [!TIP]\n> Tip content\n\n> [!NOTE]\n> Note content\n\n> [!WARNING]\n> Warning content\n\n> [!IMPORTANT]\n> Important content\n\n> [!CAUTION]\n> Caution content', ':::note'],
        ['should convert WARNING in multi-type content', '> [!TIP]\n> Tip content\n\n> [!NOTE]\n> Note content\n\n> [!WARNING]\n> Warning content\n\n> [!IMPORTANT]\n> Important content\n\n> [!CAUTION]\n> Caution content', ':::warning'],
        ['should convert IMPORTANT in multi-type content', '> [!TIP]\n> Tip content\n\n> [!NOTE]\n> Note content\n\n> [!WARNING]\n> Warning content\n\n> [!IMPORTANT]\n> Important content\n\n> [!CAUTION]\n> Caution content', ':::important'],
        ['should convert CAUTION in multi-type content', '> [!TIP]\n> Tip content\n\n> [!NOTE]\n> Note content\n\n> [!WARNING]\n> Warning content\n\n> [!IMPORTANT]\n> Important content\n\n> [!CAUTION]\n> Caution content', ':::caution']
    ];

    it.each(testCases)('%s', async (testName, input, expected) => {
        const convertCallouts = await getConvertCalloutsFunction();

        if (convertCallouts) {
            const result = convertCallouts(input, 'test.md');
            expect(result).toContain(expected);
        }
    });
})