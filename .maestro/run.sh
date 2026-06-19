#!/usr/bin/env bash
# Run each Maestro flow in its own invocation and report a per-flow tally.
# Running flows one at a time (instead of one big `maestro test flows/` call)
# avoids the iOS WebDriverAgent / long-run driver degradation that flakes a
# random flow late in a 23-flow sequence. Each flow is self-contained.
#
# Default is a single attempt per flow: a flow that fails here is a real failure
# to investigate, not something to paper over. MAESTRO_RETRIES is available only
# for genuinely flaky CI infrastructure, not as a substitute for fixing a flow.
#
# Usage:
#   .maestro/run.sh                       # whichever single device is connected
#   MAESTRO_DEVICE=<udid> .maestro/run.sh # target a specific device
#   MAESTRO_RETRIES=1 .maestro/run.sh     # allow one retry (default 0)
set -u

here="$(cd "$(dirname "$0")" && pwd)"
flows_dir="$here/flows"
retries="${MAESTRO_RETRIES:-0}"

device_arg=()
if [ -n "${MAESTRO_DEVICE:-}" ]; then
  device_arg=(--device "$MAESTRO_DEVICE")
fi

failed=()
for flow in "$flows_dir"/*.yaml; do
  name="$(basename "$flow")"
  passed=0
  for attempt in $(seq 1 "$((retries + 1))"); do
    if maestro "${device_arg[@]}" test "$flow" >/tmp/maestro-run-last.log 2>&1; then
      echo "PASS  $name (attempt $attempt)"
      passed=1
      break
    fi
    echo "RETRY $name (attempt $attempt failed)"
  done
  if [ "$passed" -ne 1 ]; then
    failed+=("$name")
  fi
done

echo "----------------------------------------"
if [ "${#failed[@]}" -eq 0 ]; then
  echo "ALL FLOWS PASSED"
  exit 0
fi
echo "FAILED: ${failed[*]}"
exit 1
