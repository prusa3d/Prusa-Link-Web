#!/usr/bin/env bash
# `make` runs this: each setup step with a progress bar, its output kept in a
# log that is shown only when the step fails, then the dev server in front.
set -uo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-5957}"
MOCK_KEY="${MOCK_KEY:-mockapikey12345}"
NODE_MIN="22.12"
LOG_DIR="node_modules/.cache/prusalink-start"
STEPS=4
STEP=0

if [ -t 1 ]; then
  BOLD=$'\e[1m' DIM=$'\e[2m' GREEN=$'\e[32m' RED=$'\e[31m' RESET=$'\e[0m'
else
  BOLD='' DIM='' GREEN='' RED='' RESET=''
fi

bar() {
  local done=$1 width=20 filled
  filled=$((done * width / STEPS))
  printf '%s%s' "$(printf '%*s' "$filled" '' | tr ' ' '#')" "$(printf '%*s' $((width - filled)) '' | tr ' ' '.')"
}

# step "label" command... : runs the command quietly with a spinner.
step() {
  local label=$1
  shift
  STEP=$((STEP + 1))
  mkdir -p "$LOG_DIR" 2>/dev/null || LOG_DIR=$(mktemp -d)
  local log="$LOG_DIR/step-$STEP.log" start=$SECONDS
  "$@" >"$log" 2>&1 &
  local pid=$! spin='|/-\' i=0
  while kill -0 "$pid" 2>/dev/null; do
    if [ -t 1 ]; then
      printf '\r[%s] %d/%d %s %s' "$(bar $((STEP - 1)))" "$STEP" "$STEPS" "$label" "${spin:i++%4:1}"
    fi
    sleep 0.1
  done
  if wait "$pid"; then
    printf '\r[%s] %d/%d %s %s✓%s %s(%ds)%s\e[K\n' "$(bar "$STEP")" "$STEP" "$STEPS" "$label" \
      "$GREEN" "$RESET" "$DIM" $((SECONDS - start)) "$RESET"
  else
    printf '\r[%s] %d/%d %s %s✗%s\e[K\n\n' "$(bar $((STEP - 1)))" "$STEP" "$STEPS" "$label" "$RED" "$RESET"
    cat "$log"
    printf '\n%sFailed: %s (log: %s)%s\n' "$RED" "$label" "$log" "$RESET"
    exit 1
  fi
}

check_node() {
  command -v node >/dev/null || { echo "Node.js $NODE_MIN+ is needed (nvm install, see .nvmrc)"; return 1; }
  node -e '
    const [a, b] = process.versions.node.split(".").map(Number);
    const [x, y] = process.argv[1].split(".").map(Number);
    if (a < x || (a === x && b < y)) {
      console.error(`Node.js ${process.argv[1]}+ is needed, found ${process.version} (nvm use)`);
      process.exit(1);
    }
    console.log(process.version);' "$NODE_MIN"
}

# Reinstalls only when package.json or the lockfile is newer than the install.
install_deps() {
  if [ -f node_modules/.modules.yaml ] &&
    [ node_modules/.modules.yaml -nt package.json ] &&
    [ node_modules/.modules.yaml -nt pnpm-lock.yaml ]; then
    echo "up to date"
    return 0
  fi
  corepack pnpm install && touch node_modules/.modules.yaml
}

check_port() {
  if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "Port $PORT is in use. Stop what runs there, or run: make DEV_PORT=<another>"
    lsof -iTCP:"$PORT" -sTCP:LISTEN
    return 1
  fi
}

printf '%sPrusaLink Web%s: setting up\n\n' "$BOLD" "$RESET"
step "Node.js"              check_node
step "Dependencies"         install_deps
step "API spec and types"   corepack pnpm spec:sync
step "Port $PORT"           check_port

URL="http://localhost:$PORT/#key=$MOCK_KEY"
printf '\n%sReady.%s Opening %s\n' "$GREEN" "$RESET" "$URL"
printf '%sMock printer panel: http://localhost:%s/dev/panel.html   Stop: Ctrl+C%s\n\n' "$DIM" "$PORT" "$RESET"
exec corepack pnpm exec vite --port "$PORT" --strictPort --open "/#key=$MOCK_KEY"
