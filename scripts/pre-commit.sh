#!/bin/sh
# Prevent committing a package-lock.json that contains local links.
# Run "npm run unlink:core" to restore registry resolution before committing.

if grep -q '"link": true' package-lock.json 2>/dev/null; then
  # The workspace link for apps/ide is expected, so only flag if-script-core links.
  if grep -q '"../if-script-core"' package-lock.json 2>/dev/null; then
    echo "ERROR: package-lock.json contains a local link to if-script-core."
    echo "Run 'npm run unlink:core' before committing."
    exit 1
  fi
fi
