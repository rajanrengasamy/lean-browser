#!/bin/bash
# lean-browser basic usage examples

# Text mode: clean readable text from a webpage
lean-browser https://example.com --mode text --tokens 500

# JSON mode: structured content with metadata
lean-browser https://example.com --mode json --tokens 800

# Interactive mode: actionable elements (links, buttons, inputs)
lean-browser https://github.com/login --mode interactive --tokens 1200

# Action execution: fill a form and click
lean-browser action https://github.com/login \
  --actions "type:e1:myuser,type:e2:mypass,click:e3" \
  --snapshot

# Session management: stateful multi-step workflow
SESSION=$(lean-browser session start --url https://example.com | jq -r .sessionId)
lean-browser session snapshot --session "$SESSION"
lean-browser session close --session "$SESSION"
