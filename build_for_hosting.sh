#!/bin/bash

# Abort on error
set -e

echo "🚀 Starting Build for Shared Hosting..."

# 1. Build Frontend
# We set VITE_API_URL to '/api' so the frontend looks for weather.php in the /api subfolder
echo "📦 Building React App..."
cd app
VITE_API_URL='/api' npm run build
cd ..

# 2. Prepare Deploy Folder
echo "📂 Organizing files in ./deploy..."
rm -rf deploy
mkdir -p deploy/api

# Copy Frontend (dist -> root)
cp -r app/dist/* deploy/

# Copy Backend (backend -> api)
cp -r backend/* deploy/api/

# Cleanup unnecessary dev files from backend if any (e.g. .ts files if we had them, but we only havephp)
# Ensure weather.db is NOT copied if it exists locally, usually we generate it on server
# But if user generated it locally, maybe they want to upload it. 
# Let's copy it if it exists, user can overwrite.
# Actually, strict copy is fine.

echo "✅ Build Complete!"
echo "------------------------------------------------"
echo "The 'deploy' folder is ready to upload."
echo ""
echo "👉 To upload via SSH/SCP (replace user@host and path):"
echo "   scp -r deploy/* user@your-hosting.com:/var/www/html/public_html/"
echo ""
echo "👉 Or drag-and-drop the contents of 'deploy' via FTP."
