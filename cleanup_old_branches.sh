#!/bin/bash

# Script to clean up old merged branches in the uniteDiscord repository
# This will help prevent Jenkins from unnecessarily building old branches

# Function to display usage
usage() {
    echo "Usage: $0 [-d DATE] [-p PATTERN]"
    echo "  -d DATE: Delete branches older than specified date (format YYYY-MM-DD, default: 2026-01-21)"
    echo "  -p PATTERN: Only consider branches matching pattern (optional)"
    echo "  -h: Show this help message"
    exit 1
}

# Default values
DEFAULT_DATE="2026-01-21"
DATE="$DEFAULT_DATE"
PATTERN=""

# Parse command line options
while getopts "d:p:h" opt; do
    case $opt in
        d)
            DATE="$OPTARG"
            ;;
        p)
            PATTERN="$OPTARG"
            ;;
        h)
            usage
            ;;
        \?)
            echo "Invalid option: -$OPTARG" >&2
            usage
            ;;
    esac
done

echo "Fetching latest changes..."
git fetch origin

echo "Finding branches that were last updated before $DATE..."

# Get old branches based on date and optional pattern
if [ -n "$PATTERN" ]; then
    OLD_BRANCHES=$(git for-each-ref --format='%(committerdate:short)%09%(refname:short)' --sort=-committerdate refs/remotes/origin/ | awk -v date="$DATE" '$1<date {print $2}' | grep "$PATTERN")
else
    OLD_BRANCHES=$(git for-each-ref --format='%(committerdate:short)%09%(refname:short)' --sort=-committerdate refs/remotes/origin/ | awk -v date="$DATE" '$1<date {print $2}')
fi

if [ -z "$OLD_BRANCHES" ]; then
    echo "No branches found that are older than $DATE"
    exit 0
fi

echo "Found the following old branches to clean up:"
echo "$OLD_BRANCHES"

read -p "Do you want to delete these remote branches? (yes/no): " -r
if [[ $REPLY =~ ^[Yy]es$ ]]; then
    for branch in $OLD_BRANCHES; do
        echo "Deleting remote branch: $branch"
        git push origin --delete "$branch"
    done

    # Also delete local remote-tracking branches that were deleted
    git remote prune origin
    echo "Branch cleanup completed!"
else
    echo "Cancelled branch deletion."
fi

# Also check for any local branches that track deleted remotes
echo "Checking for local branches that track deleted remotes..."
git branch -vv | grep ': gone]' | awk '{print $1}' | while read branch; do
    if [ -n "$branch" ]; then
        echo "Local branch $branch tracks a deleted remote branch"
        read -p "Delete local branch $branch? (yes/no): " -r
        if [[ $REPLY =~ ^[Yy]es$ ]]; then
            git branch -D "$branch"
            echo "Deleted local branch $branch"
        fi
    fi
done