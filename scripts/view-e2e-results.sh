#!/bin/bash
# View E2E Test Results - Quick access to test artifacts

set -e

RESULTS_DIR="frontend/test-results"
REPORT_DIR="frontend/playwright-report"

cd "$(dirname "$0")/.."

echo "========================================"
echo "E2E Test Results Viewer"
echo "========================================"

# Check if results exist
if [ ! -d "$RESULTS_DIR" ]; then
    echo "❌ No test results found in $RESULTS_DIR"
    echo ""
    echo "Run tests first:"
    echo "  ./scripts/run-e2e-local.sh"
    exit 1
fi

echo ""
echo "📁 Test Results Directory: $RESULTS_DIR"
echo ""

# List all test result directories
echo "Available test results:"
echo "----------------------------------------"
find "$RESULTS_DIR" -maxdepth 1 -type d ! -name "test-results" | while read -r dir; do
    test_name=$(basename "$dir")
    if [ "$test_name" != "." ]; then
        echo "  📄 $test_name"

        # Show what artifacts are available
        if [ -f "$dir/trace.zip" ]; then
            echo "     - trace.zip (view with: npx playwright show-trace $dir/trace.zip)"
        fi
        if [ -f "$dir/test-failed-1.png" ]; then
            echo "     - test-failed-1.png"
        fi
        if [ -f "$dir/video.webm" ]; then
            echo "     - video.webm"
        fi
        if [ -f "$dir/error-context.md" ]; then
            echo "     - error-context.md"
        fi
        echo ""
    fi
done

echo "========================================"
echo "Quick Actions"
echo "========================================"
echo ""
echo "1. View HTML Report:"
echo "   npx playwright show-report $REPORT_DIR"
echo ""
echo "2. View a specific trace:"
echo "   npx playwright show-trace $RESULTS_DIR/[test-name]/trace.zip"
echo ""
echo "3. View screenshots:"
echo "   xdg-open $RESULTS_DIR/[test-name]/test-failed-1.png"
echo ""
echo "4. View videos:"
echo "   xdg-open $RESULTS_DIR/[test-name]/video.webm"
echo ""
echo "5. View error context:"
echo "   cat $RESULTS_DIR/[test-name]/error-context.md"
echo ""

# Ask if user wants to open HTML report
read -p "Open HTML report now? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Opening HTML report..."
    npx playwright show-report "$REPORT_DIR"
fi
