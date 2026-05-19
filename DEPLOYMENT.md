# 🚀 Hello Pepo Deployment Guide

This guide explains how to deploy Hello Pepo with the frontend on Netlify and the backend on Render.com.

## 1. Push to GitHub
First, you need to push your project to a GitHub repository.
1. Create a new repository on GitHub.
2. Initialize git in your project:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

## 2. Deploy Backend on Render.com
Render will host the Node.js API and manage file storage.
1. Go to [Render.com](https://render.com) and sign in.
2. Click **New +** and select **Blueprint**.
3. Connect your GitHub account and select your `Hello Pepo` repository.
4. Render will automatically read the `render.yaml` file in the project.
5. Apply the blueprint. Render will create the Web Service and attach a persistent Disk for the `/uploads` folder.
6. Once deployed, copy the Render URL (e.g., `https://hello-pepo-api-xxxx.onrender.com`).

*Note:* Update the URL in `netlify.toml` (`to = "..."`) to match the actual Render URL if you used a different name.

## 3. Deploy Frontend on Netlify
Netlify will host the React app and proxy `/api/*` requests to Render.
1. Go to [Netlify.com](https://netlify.com) and sign in.
2. Click **Add new site** -> **Import an existing project**.
3. Connect your GitHub account and select your repository.
4. Build settings will automatically populate from `netlify.toml` (Build command: `npm run build`, Publish directory: `dist`).
5. Click **Deploy site**.
6. (Optional) If you want the frontend to call Render directly instead of using Netlify proxy, set the `VITE_API_URL` environment variable in Netlify to your Render URL.

## 4. Test the Upload System
1. Go to your Netlify site URL.
2. Navigate to **Upload** and submit a file.
3. You should see the progress bar and a "File uploaded! Waiting for admin approval." message.
4. Go to `/admin` (credentials: `admin` / `admin123`) and approve the file.
5. Go back to the homepage. Your file should now be visible and downloadable!
