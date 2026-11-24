# Humanly Deployment & Operations Guide

This guide describes how to deploy the **Humanly** platform across various cloud and on-premise environments.

---

## 1. Quick Local Execution

### Node.js (Recommended)
```bash
node server.js
```

### Python
```bash
python server.py
```

Access the platform at `http://localhost:8080`.

---

## 2. Docker Deployment

Create a `Dockerfile` in the root:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY . .
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t humanly-platform:latest .
docker run -d -p 8080:8080 --name humanly humanly-platform:latest
```

---

## 3. Reverse Proxy with Nginx

Sample Nginx block:

```nginx
server {
    listen 80;
    server_name portal.yourcompany.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 4. Systemd Service (Linux Server)

Create `/etc/systemd/system/humanly.service`:

```ini
[Unit]
Description=Humanly People & Engagement Platform
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/humanly
ExecStart=/usr/bin/node /var/www/humanly/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=8080

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable humanly
sudo systemctl start humanly
```
