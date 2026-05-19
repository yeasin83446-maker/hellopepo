# Hello Pepo — Deployment Guide

## Step 1: Upload code to GitHub

1. Go to https://github.com and create a new repository named `hello-pepo`
2. Upload ALL your project files to the repository

## Step 2: Deploy Backend on Render.com

1. Go to https://render.com and sign up (free)
2. Click "New +" → "Web Service"
3. Connect your GitHub account
4. Select your `hello-pepo` repository
5. Use these settings:
   - Name: hello-pepo-api
   - Build Command: npm install
   - Start Command: npx tsx server.ts
6. Click "Create Web Service"
7. Wait for deploy to finish
8. Your backend URL will be: https://hello-pepo-api.onrender.com

## Step 3: Connect Netlify to Render

Your `netlify.toml` already has this line:
  to = "https://hello-pepo-api.onrender.com/api/:splat"

This means Netlify will automatically forward all /api/ requests to Render!

## Step 4: Redeploy Netlify

1. Go to https://app.netlify.com
2. Open your hello-pepo site
3. Click "Deploys" → "Trigger deploy" → "Deploy site"

## Done! ✅

- Upload a file at: https://hellopepo.netlify.app/upload
- Admin panel at: https://hellopepo.netlify.app/admin
- Admin login: username = admin, password = admin123
