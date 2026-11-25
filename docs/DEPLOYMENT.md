# Humanly Production Deployment and Operations Guide

This guide describes operational procedures for hosting, scaling, and managing the Humanly platform across local, containerized, and dedicated cloud environments.

---

Local and Standalone Execution

For standalone execution, Humanly requires either a Node.js runtime of version 20 or greater, or a Python 3.11 environment.

To start with Node.js, execute:

```bash
node server.js
```

To run with Python, execute:

```bash
python server.py
```

Both runtimes connect directly to the local relational database and begin serving traffic on port 8080.

---

Containerized Deployment with Docker

To deploy the platform within an isolated container, create a Dockerfile at the root of your repository:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
COPY . .
EXPOSE 8080
ENV NODE_ENV=production
CMD ["node", "server.js"]
```

Build the container image and launch the process:

```bash
docker build -t humanly-platform:latest .
docker run -d -p 8080:8080 --name humanly humanly-platform:latest
```

The application is now isolated, hardened, and accessible on host port 8080.

---

Reverse Proxy Configuration with Nginx

When deploying in production behind a web server, Nginx acts as an SSL termination point, reverse proxy, and static cache accelerator. A typical configuration block is provided below:

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

Process Management with Linux Systemd

For enterprise Linux servers, running Humanly under systemd ensures automatic process supervision, logging, and recovery upon unexpected termination or system reboots.

Create the service definition file at /etc/systemd/system/humanly.service:

```ini
[Unit]
Description=Humanly People and Engagement Platform
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

Reload the systemd daemon, enable the service, and verify status:

```bash
sudo systemctl daemon-reload
sudo systemctl enable humanly
sudo systemctl start humanly
sudo systemctl status humanly
```
