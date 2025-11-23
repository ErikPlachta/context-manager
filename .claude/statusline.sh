#!/bin/bash

# Read JSON from stdin
data=$(cat)

# Extract values using bash string manipulation
transcript=$(echo "$data" | grep -o '"transcript_path":"[^"]*"' | cut -d'"' -f4)
model=$(echo "$data" | grep -o '"display_name":"[^"]*"' | cut -d'"' -f4)

# Get git info
branch=$(git branch --show-current 2>/dev/null)
modified=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
added=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
untracked=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')

# Get token usage
tokens=""
if [[ -n "$transcript" && -f "$transcript" ]]; then
  # Find last assistant message and extract input_tokens
  input_tokens=$(tac "$transcript" 2>/dev/null | grep '"type":"assistant"' | head -1 | \
                 grep -o '"input_tokens":[0-9]*' | cut -d':' -f2)
  
  if [[ -n "$input_tokens" && "$input_tokens" != "0" ]]; then
    # Set limit
    if [[ "$model" == *"Sonnet 4.5"* ]]; then
      limit=1000000
    else
      limit=200000
    fi
    
    pct=$((input_tokens * 100 / limit))
    tokens=" | Ctx:${input_tokens}/${limit} (${pct}%)"
  fi
fi

# Output
if [ -n "$branch" ]; then
  echo "  $branch | M:$modified A:$added ?:$untracked${tokens}"
fi