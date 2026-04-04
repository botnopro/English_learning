# Deploy Frontend To Vercel

## 1. Push to GitHub
1. Commit all files.
2. Push repository to GitHub.

## 2. Import to Vercel
1. Open https://vercel.com/new
2. Import your GitHub repository.
3. Framework preset: Next.js (auto-detected).

## 3. Configure Environment Variables
In Vercel project settings, add:

- `NEXT_PUBLIC_API_BASE_URL` = your backend URL + `/api`
  - Example: `https://english-learning-be.onrender.com/api`
- `NEXT_PUBLIC_API_DEBUG` = `1` (optional, can set `0` in production)

## 4. Deploy
1. Click Deploy.
2. After deploy, open the Vercel URL and test:
   - Login/Register
   - My vocab
   - Community tab
   - Add word / remove from my vocab

## 5. Recommended Backend CORS
Allow these origins on backend CORS:
- `https://<your-vercel-domain>`
- `http://localhost:3000`

## 6. Local Development
1. Copy `.env.example` to `.env.local`.
2. Adjust `NEXT_PUBLIC_API_BASE_URL`.
3. Run:

```bash
npm install
npm run dev
```
