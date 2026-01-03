#!/usr/bin/env bash
set -euo pipefail

raw_ref="${1:-${GITHUB_HEAD_REF:-${GITHUB_REF_NAME:-${BRANCH_NAME:-}}}}"

if [[ -z "$raw_ref" || "$raw_ref" == "HEAD" ]]; then
  raw_ref="preview"
fi

alias=$(echo "$raw_ref" \
  | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9-]+/-/g; s/^-+//; s/-+$//')

if [[ -z "$alias" ]]; then
  alias="preview"
fi

alias=$(echo "$alias" | cut -c1-40)

printf '%s\n' "$alias"
