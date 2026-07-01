#!/bin/sh
# #region agent log
LOG_PATH="${DEBUG_LOG_PATH:-/Users/spacode/Desktop/FullstackProjects/poc_v1_marketing_system/.cursor/debug-42c701.log}"
TS=$(date +%s000)
EXPRESS=$([ -d /app/node_modules/express ] && echo true || echo false)
DOTENV=$([ -d /app/node_modules/dotenv ] && echo true || echo false)
SPACODE_DB=$([ -d /app/node_modules/@spacode/db ] && echo true || echo false)
NODE_MODULES_COUNT=$(ls -1 /app/node_modules 2>/dev/null | wc -l | tr -d ' ')
printf '{"sessionId":"42c701","runId":"%s","hypothesisId":"A","location":"docker-debug-preflight.sh","message":"root node_modules missing service deps","data":{"express":%s,"dotenv":%s,"spacodeDb":%s,"nodeModulesEntryCount":%s,"cwd":"/app"},"timestamp":%s}\n' "${DEBUG_RUN_ID:-pre-fix}" "$EXPRESS" "$DOTENV" "$SPACODE_DB" "$NODE_MODULES_COUNT" "$TS" >> "$LOG_PATH"
printf '{"sessionId":"42c701","runId":"%s","hypothesisId":"B","location":"docker-debug-preflight.sh","message":"service-level node_modules absent in runner","data":{"serviceNodeModulesExists":%s},"timestamp":%s}\n' "${DEBUG_RUN_ID:-pre-fix}" "$([ -d /app/services ] && echo true || echo false)" "$TS" >> "$LOG_PATH"
printf '{"sessionId":"42c701","runId":"%s","hypothesisId":"C","location":"docker-debug-preflight.sh","message":"workspace packages absent in runner","data":{"packagesDirExists":%s},"timestamp":%s}\n' "${DEBUG_RUN_ID:-pre-fix}" "$([ -d /app/packages ] && echo true || echo false)" "$TS" >> "$LOG_PATH"
# #endregion
