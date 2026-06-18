#!/usr/bin/env bash
# Fire a burst of requests at one endpoint and print the status code of each,
# so you can eyeball where the rate limiter starts returning 429.
#
# Usage:
#   ./burst.sh [-n COUNT] [-m METHOD] [-d BODY] [-t TOKEN] [-f XFF] [-H HEADER] URL
#
#   -n COUNT    number of requests to send (default 10)
#   -m METHOD   HTTP method (default POST)
#   -d BODY     request body (default a minimal JSON login payload)
#   -t TOKEN    bearer token; sent as "Authorization: Bearer <TOKEN>"
#   -f XFF      X-Forwarded-For value (simulates the client IP behind a proxy)
#   -H HEADER   extra header, repeatable (e.g. -H "Content-Type: application/json")
#
# Examples:
#   # 6 logins against local -> expect the 6th to come back 429 (capacity 5/min)
#   ./burst.sh -n 6 -f 203.0.113.9 http://localhost:8080/api/v1/auth/login
#
#   # authenticated create-post burst from one IP under a real token
#   ./burst.sh -n 35 -t "$TOKEN" -f 203.0.113.9 \
#       -d '{"content":"load check","imageUrl":null,"parentPostId":null}' \
#       http://localhost:8080/api/v1/posts
#
# NEVER point this at the production URL. Use a local docker-compose stack or a
# disposable staging instance.
set -euo pipefail

COUNT=10
METHOD=POST
BODY='{"identifier":"ghost-user","password":"Password123!"}'
TOKEN=""
XFF=""
EXTRA_HEADERS=()

while getopts "n:m:d:t:f:H:" opt; do
  case "$opt" in
    n) COUNT="$OPTARG" ;;
    m) METHOD="$OPTARG" ;;
    d) BODY="$OPTARG" ;;
    t) TOKEN="$OPTARG" ;;
    f) XFF="$OPTARG" ;;
    H) EXTRA_HEADERS+=("$OPTARG") ;;
    *) echo "see header of $0 for usage" >&2; exit 2 ;;
  esac
done
shift $((OPTIND - 1))

URL="${1:-}"
if [[ -z "$URL" ]]; then
  echo "error: target URL is required" >&2
  exit 2
fi
case "$URL" in
  *://*) : ;;
  *) echo "error: URL must be absolute (http://host:port/path)" >&2; exit 2 ;;
esac

curl_args=(-s -o /dev/null -w '%{http_code}' -X "$METHOD" -H 'Content-Type: application/json')
[[ -n "$TOKEN" ]] && curl_args+=(-H "Authorization: Bearer $TOKEN")
[[ -n "$XFF" ]] && curl_args+=(-H "X-Forwarded-For: $XFF")
for h in "${EXTRA_HEADERS[@]:-}"; do
  [[ -n "$h" ]] && curl_args+=(-H "$h")
done
[[ -n "$BODY" ]] && curl_args+=(--data "$BODY")

echo "burst: $METHOD $URL  (n=$COUNT, xff=${XFF:-none})"
limited=0
for ((i = 1; i <= COUNT; i++)); do
  code="$(curl "${curl_args[@]}" "$URL" || echo "ERR")"
  marker=""
  if [[ "$code" == "429" ]]; then
    marker="  <- rate limited"
    limited=$((limited + 1))
  fi
  printf '  %3d  %s%s\n' "$i" "$code" "$marker"
done
echo "done: $limited/$COUNT returned 429"
