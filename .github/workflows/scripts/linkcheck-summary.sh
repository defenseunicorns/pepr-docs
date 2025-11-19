#!/bin/bash
# Generate GitHub Actions summary for link validation
# Usage: ./linkcheck-summary.sh <output-file> <report-dir> <exit-code>

OUTPUT_FILE="$1"
REPORT_DIR="$2"
EXIT_CODE="$3"

# Find the most recent broken-links report JSON
REPORT_FILE=$(find "$REPORT_DIR" -maxdepth 1 -name "broken-links-report-*.json" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | cut -d' ' -f2-)

echo "## Link Validation Summary" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Extract formatted totals from console output (preserves spacing/commas)
if [ -f "linkcheck-output.txt" ]; then
    awk '/Link Validation Summary/,/^$/ {
      if (/Valid:|Skipped:|Warnings:|Broken:|Pages:/) {
        print "- " $0
      }
    }' linkcheck-output.txt >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
else
    echo "No linkcheck console output found; unable to extract formatted totals." >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

# Process broken links
if [ -f "$REPORT_FILE" ]; then
    BROKEN_COUNT=$(jq '.brokenLinks | length' "$REPORT_FILE")
    if [ "$BROKEN_COUNT" -gt 0 ]; then
        # Group broken links by page and display each link
        jq -r '.brokenLinks | group_by(.parent) | .[] |
            "**Page:** \(.[0].parent)\n" +
            ([.[] | "- **BROKEN** [\(.status)] \(.url)"] | join("\n"))' "$REPORT_FILE" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi

    # Process warnings (if present)
    WARNING_COUNT=$(jq '.warnings | length // 0' "$REPORT_FILE")
    if [ "$WARNING_COUNT" -gt 0 ]; then
        jq -r '.warnings | group_by(.parent) | .[] |
            "**Page:** \(.[0].parent)\n" +
            ([.[] | "- **WARNING** [\(.status)] \(.url)"] | join("\n"))' "$REPORT_FILE" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
else
    echo "No broken-links JSON report found in $REPORT_DIR" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

# Final status message
if [ "$EXIT_CODE" != "0" ]; then
    {
        echo "**Link validation failed**"
        echo ""
        echo "Please check the broken links report artifact for details."
    } >> "$OUTPUT_FILE"
    exit 1
else
    echo "**All links validated successfully**" >> "$OUTPUT_FILE"
fi
