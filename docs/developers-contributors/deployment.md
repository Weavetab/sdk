---
title: "Docker & Production"
description: "Run Weavetab in Docker with headless Chromium."
product: sdk
section: developers-contributors
icon: Container
slug: deployment
---

# Docker & Production Deployment

```dockerfile
FROM node:20-slim

# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Install Weavetab MCP globally
RUN npm install -g @weavetab/mcp@latest

ENV CHROME_PATH=/usr/bin/chromium
EXPOSE 3000

CMD ["weavetab", "--ws", "--headless", "--port", "3000"]
```

```bash
docker build -t weavetab-server .
docker run -p 3000:3000 -v ~/.weavetab:/root/.weavetab weavetab-server
```
