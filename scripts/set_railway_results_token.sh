#!/usr/bin/env bash
#
# Set RESULTS_TOKEN in your Railway project — the read-only token that gates the
# /results supervisor view (separate from ADMIN_TOKEN, safe to share).
#
# WHY a script: the app can already auto-create a results token in its database
# (Admin → Recruit → "Supervisor results link"), so you may not need this at all.
# Use this only if you'd rather pin a fixed token as a Railway env var (which
# always takes precedence over the auto-generated one).
#
# This must run on YOUR machine — it needs a Railway login that a CI sandbox
# cannot have. One-time setup:
#   npm i -g @railway/cli      # install the Railway CLI
#   railway login              # opens a browser to authenticate
#   railway link               # pick the project + service for this app
#
# Usage:
#   ./scripts/set_railway_results_token.sh            # generates a strong token
#   ./scripts/set_railway_results_token.sh MYTOKEN    # uses the token you pass
#
set -euo pipefail

TOKEN="${1:-}"
if [ -z "${TOKEN}" ]; then
  if command -v node >/dev/null 2>&1; then
    TOKEN="$(node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))")"
  else
    TOKEN="$(openssl rand -base64 24 | tr -d '/+=' | cut -c1-32)"
  fi
fi

if ! command -v railway >/dev/null 2>&1; then
  echo "✗ Railway CLI not found."
  echo "  Install it, then log in and link the project:"
  echo "    npm i -g @railway/cli && railway login && railway link"
  echo
  echo "  Or just add it in the dashboard: Railway → your service → Variables →"
  echo "  New Variable → RESULTS_TOKEN = ${TOKEN}"
  exit 1
fi

# Newer Railway CLIs use `--set "KEY=VALUE"`; older ones use `set KEY=VALUE`.
if railway variables --set "RESULTS_TOKEN=${TOKEN}" 2>/dev/null; then :;
elif railway variables set "RESULTS_TOKEN=${TOKEN}" 2>/dev/null; then :;
else
  echo "✗ Could not set the variable via the CLI (is the project linked? run 'railway link')."
  echo "  Dashboard fallback: Railway → service → Variables → RESULTS_TOKEN = ${TOKEN}"
  exit 1
fi

echo "✓ RESULTS_TOKEN set in Railway (a redeploy will apply it)."
echo "  Your read-only /results share token is:"
echo "    ${TOKEN}"
echo "  Share:  <your-app-url>/results?token=${TOKEN}"
