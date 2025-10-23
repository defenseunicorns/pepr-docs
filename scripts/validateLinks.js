#!/usr/bin/env node

/**
 * Script to validate that there are no broken links (images, anchors, etc.) in the website
 * Usage: node scripts/validateLinks.js [url] [--silent]
 *
 * Examples:
 *   node scripts/validateLinks.js http://localhost:4173
 *   node scripts/validateLinks.js (will use a default URL if none provided)
 *   node scripts/validateLinks.js --silent (will only output errors)
 */

import fs from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import { LinkChecker } from 'linkinator'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const DEFAULT_URL = 'http://localhost:4321'
const CONFIG_PATH = path.resolve(__dirname, '..', 'linkinator.config.json')

async function readConfig() {
    try {
        const data = await fs.promises.readFile(CONFIG_PATH, 'utf8')
        return JSON.parse(data)
    } catch (error) {
        console.error('Error reading config:', error.message)
        return {}
    }
}

async function runLinkCheck(url, silent = false) {
    try {
        const config = await readConfig()

        const checkerConfig = {
            path: url,
            recurse: config.recurse !== undefined ? config.recurse : true,
            concurrency: config.concurrency || 100,
            retry: config.retry !== undefined ? config.retry : true,
            linksToSkip: Array.isArray(config.skip) ? config.skip : [],
            timeout: config.timeout || 10000
        }

        const checker = new LinkChecker()
        const brokenLinks = []
        const pagesChecked = new Set()
        let checkedLinks = 0
        let skippedLinks = 0
        let validLinks = 0

        checker.on('pagestart', (url) => pagesChecked.add(url))

        checker.on('link', (result) => {
            checkedLinks++

            if (result.state === 'SKIPPED') {
                skippedLinks++
            } else if (result.state === 'BROKEN') {
                brokenLinks.push({
                    url: result.url,
                    parent: result.parent,
                    statusCode: result.status
                })
            } else if (result.state === 'OK') {
                validLinks++
            }
        })

        console.log('\n🔍 Starting link validation')
        console.log(`   URL: ${url}`)
        console.log(`   Recurse: ${checkerConfig.recurse}`)
        console.log(`   Concurrency: ${checkerConfig.concurrency}`)
        console.log(`   Timeout: ${checkerConfig.timeout}ms`)
        console.log(`   Skip patterns: ${checkerConfig.linksToSkip.length}`)
        console.log('   Checking links...\n')

        const results = await checker.check(checkerConfig)

        // Print summary
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log('📊 LINK VALIDATION SUMMARY')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
        console.log(`   ✅ Valid links:    ${validLinks.toLocaleString()}`)
        console.log(`   ⏭️  Skipped links:  ${skippedLinks.toLocaleString()}`)
        console.log(`   ${brokenLinks.length > 0 ? '❌' : '✅'} Broken links:   ${brokenLinks.length.toLocaleString()}`)
        console.log(`   📄 Pages checked:  ${pagesChecked.size.toLocaleString()}`)
        console.log(`   📝 Total checked:  ${results.links.length.toLocaleString()}`)

        // Check for issues
        if (validLinks === 0 && results.links.length > 0) {
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            console.log('❌ VALIDATION FAILED')
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            console.log(`\n⚠️  Found ${results.links.length} links but 0 valid.`)
            console.log('\n💡 Possible causes:')
            console.log('   • Server not running at specified URL')
            console.log('   • All links skipped by skip patterns')
            console.log('   • Network connectivity issues\n')
            process.exit(1)
        }

        if (brokenLinks.length > 0) {
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
            console.log('🔴 BROKEN LINKS DETAILS')
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

            // Group by parent page
            const byPage = {}
            brokenLinks.forEach(link => {
                if (!byPage[link.parent]) byPage[link.parent] = []
                byPage[link.parent].push(link)
            })

            Object.entries(byPage).forEach(([page, links], i) => {
                console.log(`\n📄 Page ${i + 1}: ${page}`)
                links.forEach((link, j) => {
                    console.log(`\n   ${j + 1}. ❌ ${link.url}`)
                })
            })

            // Save report
            const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0]
            const reportPath = path.resolve(__dirname, '..', `broken-links-report-${timestamp}.json`)

            fs.writeFileSync(reportPath, JSON.stringify({
                date: new Date().toISOString(),
                url,
                summary: {
                    total: results.links.length,
                    valid: validLinks,
                    broken: brokenLinks.length,
                    skipped: skippedLinks,
                    pagesChecked: Array.from(pagesChecked)
                },
                brokenLinks: brokenLinks.map(link => ({
                    url: link.url,
                    parent: link.parent,
                    status: link.statusCode
                }))
            }, null, 2))

            console.log(`\n💾 Report saved to: ${reportPath}\n`)
            process.exit(1)
        } else {
            console.log('\n✅ SUCCESS! No broken links found.\n')
        }
    } catch (error) {
        console.error('Error running link checker:', error.message)
        process.exit(1)
    }
}

// Parse args and run
const args = process.argv.slice(2)
const silent = args.includes('--silent')
const url = args.filter(arg => arg !== '--silent')[0] || DEFAULT_URL

runLinkCheck(url, silent)
