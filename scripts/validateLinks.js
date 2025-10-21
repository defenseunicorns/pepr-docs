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

// Get the directory name
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Default configuration
const DEFAULT_URL = 'http://localhost:4321'
// Resolve to project root (one level up from scripts/)
const CONFIG_PATH = path.resolve(__dirname, '..', 'linkinator.config.json')

// Function to create a visual progress bar
function createProgressBar(percent, length = 30) {
    const filledLength = Math.floor((percent / 100) * length)
    const emptyLength = length - filledLength
    return '█'.repeat(filledLength) + '░'.repeat(emptyLength)
}

async function readConfig() {
    try {
        const configData = await fs.promises.readFile(CONFIG_PATH, 'utf8')
        return JSON.parse(configData)
    } catch (error) {
        console.error('Error reading configuration file:', error.message)
        return {}
    }
}

async function runLinkCheck(url, silent = false) {
    try {
        const config = await readConfig()

        // Check if we should include sitemap.xml
        if (config.include && Array.isArray(config.include) && config.include.includes('sitemap.xml')) {
            console.log('Checking sitemap.xml availability...')
            try {
                const sitemapUrl = `${url}/sitemap.xml`
                const response = await fetch(sitemapUrl, {
                    method: 'GET',
                    signal: AbortSignal.timeout(5000)
                })

                if (response.ok) {
                    console.log(`Sitemap found at ${sitemapUrl}`)

                    // Parse XML to extract URLs
                    try {
                        const xmlContent = await response.text()

                        // Simple regex to extract URLs from sitemap
                        const urlRegex = /<loc>(.*?)<\/loc>/g
                        const matches = [...xmlContent.matchAll(urlRegex)]

                        if (matches.length > 0) {
                            console.log(`Found ${matches.length} URLs in sitemap.xml`)
                            // We'll check these URLs in the main link check process
                        } else {
                            console.warn('Warning: No URLs found in sitemap.xml')
                        }
                    } catch (parseError) {
                        console.warn(`Warning: Failed to parse sitemap.xml: ${parseError.message}`)
                    }
                } else {
                    console.warn(
                        `Warning: Sitemap not found or not accessible at ${sitemapUrl}. Status: ${response.status}`
                    )
                }
            } catch (error) {
                console.warn(`Warning: Failed to check sitemap.xml: ${error.message}`)
            }
        }

        // Prepare configuration for the link checker
        const checkerConfig = {
            path: url,
            recurse: config.recurse !== undefined ? config.recurse : true,
            concurrency: config.concurrency || 100,
            retry: config.retry !== undefined ? config.retry : true,
            linksToSkip: Array.isArray(config.skip) ? config.skip : config.skip ? [config.skip] : [],
            timeout: config.timeout || 10000
        }

        // Initialize the link checker
        const checker = new LinkChecker()

        // Handle links as they are checked
        const brokenLinks = []
        let checkedLinks = 0
        let skippedLinks = 0
        let validLinks = 0
        let totalLinksEstimate = 0
        let linksDiscovered = 0

        // Track pages for better progress reporting
        let pagesChecked = new Set()

        // For throttling progress updates
        let lastUpdateTime = Date.now()
        const updateInterval = 100 // ms

        // Function to update progress display
        const updateProgress = (force = false) => {
            const now = Date.now()
            // Only update the display if enough time has passed or force is true
            if (!force && now - lastUpdateTime < updateInterval) return
            lastUpdateTime = now

            if (silent) return

            // Calculate dynamic total estimate - increase if we keep finding more links
            totalLinksEstimate = Math.max(totalLinksEstimate, linksDiscovered + 10)

            // If we're checking more than expected, increase estimate
            if (checkedLinks >= totalLinksEstimate - 10) {
                totalLinksEstimate = Math.ceil(totalLinksEstimate * 1.2)
            }

            const percent = Math.min(Math.floor((checkedLinks / totalLinksEstimate) * 100), 100)
            const progressBar = createProgressBar(percent)

            // Clear line and write progress
            process.stdout.write(`\r${' '.repeat(120)}\r`)
            process.stdout.write(
                `\r[${progressBar}] ${percent}% | Links: ${checkedLinks}/${totalLinksEstimate} | ` +
                    `Pages: ${pagesChecked.size} | Valid: ${validLinks} | Broken: ${brokenLinks.length} | Skipped: ${skippedLinks}`
            )
        }

        // Listen for page scanning events
        checker.on('pagestart', (url) => {
            pagesChecked.add(url)
            // Don't output page scanning events - let progress bar handle it
        })

        // Listen for link discovery events
        checker.on('linkfound', () => {
            linksDiscovered++

            // Set initial estimate based on whether recursion is enabled
            if (totalLinksEstimate === 0) {
                totalLinksEstimate = checkerConfig.recurse ? 100 : 30
            }

            // Update progress display
            updateProgress()
        })

        checker.on('link', (result) => {
            checkedLinks++

            if (result.state === 'SKIPPED') {
                skippedLinks++
                if (!silent) {
                    // Don't log each skipped link, just update progress
                    updateProgress()
                }
            } else if (result.state === 'BROKEN') {
                // Just collect broken links, don't output them yet
                brokenLinks.push({
                    url: result.url,
                    parent: result.parent,
                    statusCode: result.status
                })

                // Update progress
                if (!silent) {
                    updateProgress()
                }
            } else if (result.state === 'OK') {
                validLinks++
                if (!silent) {
                    updateProgress()
                }
            }
        })

        // Start checking
        console.log(`\n🔍 Starting link validation`)
        console.log(`   URL: ${url}`)
        console.log(`   Recurse: ${checkerConfig.recurse}`)
        console.log(`   Concurrency: ${checkerConfig.concurrency}`)
        console.log(`   Timeout: ${checkerConfig.timeout}ms`)
        console.log(`   Skip patterns: ${checkerConfig.linksToSkip.length}\n`)
        const results = await checker.check(checkerConfig)

        // Clear line
        if (!silent) {
            process.stdout.write(`\r${' '.repeat(120)}\r`)
        }

        // Print summary
        console.log(`\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`📊 LINK VALIDATION SUMMARY`)
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`   ✅ Valid links:    ${validLinks.toLocaleString()}`)
        console.log(`   ⏭️  Skipped links:  ${skippedLinks.toLocaleString()}`)
        console.log(`   ${brokenLinks.length > 0 ? '❌' : '✅'} Broken links:   ${brokenLinks.length.toLocaleString()}`)
        console.log(`   📄 Pages checked:  ${pagesChecked.size.toLocaleString()}`)
        console.log(`   📝 Total checked:  ${results.links.length.toLocaleString()}`)

        // Check if no valid links were found - this indicates a problem
        if (validLinks === 0 && results.links.length > 0) {
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
            console.log(`❌ VALIDATION FAILED`)
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
            console.log(`\n⚠️  Found ${results.links.length} total links but 0 valid links.`)
            console.log(`\nThis likely indicates a configuration or server issue.\n`)
            console.log(`💡 Possible causes:`)
            console.log(`   • Server is not running at the specified URL`)
            console.log(`   • All links are being skipped by the skip patterns`)
            console.log(`   • Network connectivity issues\n`)
            process.exit(1)
        }

        if (brokenLinks.length > 0) {
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
            console.log(`🔴 BROKEN LINKS DETAILS`)
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

            // Group broken links by the page they were found on
            const brokenLinksByPage = {}
            brokenLinks.forEach((link) => {
                if (!brokenLinksByPage[link.parent]) {
                    brokenLinksByPage[link.parent] = []
                }
                brokenLinksByPage[link.parent].push(link)
            })

            // Output broken links grouped by page
            Object.keys(brokenLinksByPage).forEach((page, pageIndex) => {
                console.log(`\n📄 Page ${pageIndex + 1}: ${page}`)

                brokenLinksByPage[page].forEach((link, linkIndex) => {
                    console.log(`\n   ${linkIndex + 1}. ❌ ${link.url}`)
                })
                console.log('')
            })

            // Create a report file with details
            const reportDate = new Date().toISOString().replace(/:/g, '-').split('.')[0]
            const reportPath = path.resolve(
                __dirname,
                '..',
                `broken-links-report-${reportDate}.json`
            )
            const reportData = {
                date: new Date().toISOString(),
                url: url,
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
            }

            fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))
            console.log(`\n💾 Detailed report saved to:`)
            console.log(`   ${reportPath}\n`)

            // Exit with failure code if broken links found
            process.exit(1)
        } else {
            console.log(`\n✅ SUCCESS! No broken links found.\n`)
        }
    } catch (error) {
        console.error('Error running link checker:', error.message)
        process.exit(1)
    }
}

function parseArgs() {
    const args = process.argv.slice(2)
    const silent = args.includes('--silent')

    // Remove the --silent flag from args if present
    const otherArgs = args.filter((arg) => arg !== '--silent')

    // The first remaining argument should be the URL, or use the default
    const url = otherArgs.length > 0 ? otherArgs[0] : DEFAULT_URL

    return { url, silent }
}

const { url, silent } = parseArgs()
runLinkCheck(url, silent)