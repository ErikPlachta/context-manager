#!/bin/bash

# Read JSON from stdin
data=$(cat)

# Extract values using bash string manipulation
transcript=$(echo "$data" | grep -o '"transcript_path":"[^"]*"' | cut -d'"' -f4)
model=$(echo "$data" | grep -o '"display_name":"[^"]*"' | cut -d'"' -f4)
session_cost=$(echo "$data" | grep -o '"total_cost_usd":[0-9.]*' | cut -d':' -f2 | head -1)

# Get git info
branch=$(git branch --show-current 2>/dev/null)
modified=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
added=$(git diff --cached --name-only 2>/dev/null | wc -l | tr -d ' ')
untracked=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')

# Get token usage and API stats
tokens=""
api_usage=""
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
    
    # Session cost
    if [[ -n "$session_cost" ]]; then
      api_usage=" | Cost:\$${session_cost}"
    fi
    
    # Message count in session
    msg_count=$(grep -c '"type":"assistant"' "$transcript" 2>/dev/null)
    if [[ -n "$msg_count" ]]; then
      api_usage="${api_usage} (${msg_count}msg)"
    fi
  fi
fi

# Model shorthand
model_short=$(echo "$model" | sed 's/Claude //' | sed 's/ 4.5/4.5/' | sed 's/ 4/4/')

# Current time
time=$(date +"%H:%M")

# Output
if [ -n "$branch" ]; then
  echo "  $branch - M:$modified, A:$added, ?:$untracked${tokens}${api_usage} | mdl:$model_short | t:$time"
else
  echo "  no-git${tokens}${api_usage} | mdl:$model_short | t:$time"
fi



# **What's added:**
# - **Session cost**: `$0.45` - tracks spend in current session
# - **Message count**: `(15msg)` - API calls made
# - **Model shorthand**: Shows "Sonnet 4.5" instead of full name
# - **Current time**: `14:32` - quick time reference
# - Shows even without git repo

# **Example output:**
# ```
#   main | M:3 A:1 ?:0 | Ctx:45000/200000 (22%) | Cost:$0.23 (8msg) | Sonnet 4 | 14:32
# ```