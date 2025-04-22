# Deployment Guide for val-js

This guide explains how to deploy the application on DigitalOcean App Platform.

## Prerequisites

- A DigitalOcean account
- Git repository containing the application code

## Setting Up the Deployment

### 1. Environment Variables

Ensure the following environment variables are set in the DigitalOcean App Platform:

```
NODE_ENV=production
NODE_OPTIONS=--experimental-specifier-resolution=node
MONGODB_URI=mongodb+srv://...
FRONTEND_URL=https://your-domain.com
```

### 2. Build Command

For App Platform, use the following build command:

```bash
cd server && npm install && node fix-mongoose.js && cd .. && npm install && npm run build && cd server
```

### 3. Run Command

Use the following run command:

```bash
node server/index.js
```

## Troubleshooting

### Cannot find module './connectionstate'

This error occurs due to Mongoose's compatibility issues with ES modules. The `fix-mongoose.js` script patches this by adding the `.js` extension to the require statements.

### ENOENT: no such file or directory, scandir '/dist/client'

This error occurs when the server can't find the frontend build files. The application is configured to look for static files in multiple possible locations:

- `../dist/client` (from the server directory)
- `../../dist/client` (fallback path)
- `/app/dist/client` (Docker path)

If you encounter this error, make sure the frontend build is completed successfully and placed in one of these locations.

## Docker Deployment

To build and run the application using Docker:

1. Build the image:
```bash
docker build -t val-js .
```

2. Run the container:
```bash
docker run -p 8080:8080 --env-file .env val-js
``` 