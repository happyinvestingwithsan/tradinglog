# Deployment Guide: FNO Trading Journal Dashboard

This dashboard is built as a highly optimized Next.js App Router application. It is ready to be published to **Vercel** so you can access your trading logs and live positions from your mobile device at any time, even if your local computer is powered off.

---

## 1. Quick Local Execution
Before deploying, you can run the dashboard locally to test it:
1. Open PowerShell or Terminal in the `dashboard` directory:
   ```bash
   cd "D:\AI Projects\Trading Log\FNO\dashboard"
   ```
2. Run the development server:
   ```bash
   npm run dev
   ```
3. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 2. Deploying to Vercel (Step-by-Step)

### Step 1: Initialize Git and Commit Code
Vercel deploys directly from GitHub. You need to push your local directory to a GitHub repository first.
1. Run these commands inside the `dashboard` folder:
   ```bash
   git init
   git add .
   git commit -m "Initialize FNO trading journal dashboard with pre-seeded data"
   ```

### Step 2: Push to GitHub
1. Go to [GitHub](https://github.com) and create a new **Private** repository named `fno-journal` (keep it private to protect your trade details).
2. Follow the instructions on GitHub to link your local repository and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/fno-journal.git
   git push -u origin main
   ```
   *(Replace `YOUR_GITHUB_USERNAME` with your actual GitHub username)*

### Step 3: Deploy on Vercel
1. Go to [Vercel](https://vercel.com) and log in using your GitHub account.
2. Click **Add New** > **Project**.
3. Under "Import Git Repository", find your `fno-journal` repository and click **Import**.
4. Leave all settings at their defaults (Vercel automatically detects Next.js configuration).
5. Click **Deploy**.

Vercel will build and host your project. In less than a minute, you will receive a secure public URL (e.g., `https://fno-journal.vercel.app`) that you can open on your mobile browser.

---

## 3. How the Dashboard Works

### Data Pre-seeding
The dashboard is preloaded with all 76 trades from your `tradebook-MV4345-FO.xlsx` file. When you open the Vercel link, it will display your metrics and positions instantly.

### Syncing Data on Mobile
1. **Interactive Manual LTP**: Under the **Active Positions** panel on your phone, you can type the current option premium price (LTP) directly on any card. The dashboard will instantly calculate and update your unrealized P&L.
2. **Kite API Connection**: If you have a paid Zerodha developer account, go to the **Connections** tab, type in your API Key and Secret, and follow the instructions to sync live trades and positions in real-time.
3. **Excel Import**: If you download a fresh tradebook Excel on your mobile or tablet, you can upload it in the **Connections** tab to refresh your journal instantly.
