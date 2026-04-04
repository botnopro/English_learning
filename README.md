# VocabMaster — English Learning App

Ứng dụng học từ vựng tiếng Anh thông minh, tích hợp API backend qua biến môi trường.

## Tính năng

- 📚 **Ôn luyện không cần đăng nhập** — Random theo chủ đề hoặc cấp độ
- 👤 **Vốn từ cá nhân** — Đăng nhập để lưu và ôn bộ từ riêng
- 🧠 **Flashcard thông minh** — Hỏi Anh→Việt hoặc Việt→Anh
- 📊 **Theo dõi tiến trình** — Ghi nhận đúng/sai, cập nhật độ khó cá nhân
- ➕ **Thêm từ mới** — Tạo từ vựng với đầy đủ thông tin (yêu cầu đăng nhập)

## API được sử dụng

| Method | Endpoint | Auth |
|--------|----------|------|
| GET | `/api/words/review/by-topic?topic=...&count=...` | Không cần |
| GET | `/api/words/review/by-level?level=...&count=...` | Không cần |
| POST | `/api/auth/login` | Không cần |
| POST | `/api/auth/register` | Không cần |
| POST | `/api/words/:id/add-to-my-vocab` | Bearer token |
| POST | `/api/words/:id/interact` | Bearer token |
| POST | `/api/words` | Bearer token |

## Cấu hình môi trường

1. Copy file `.env.example` thành `.env.local` khi chạy local.
2. Thiết lập `NEXT_PUBLIC_API_BASE_URL`:
	- Local: `http://localhost:5000/api`
	- Production: `https://<backend-domain>/api`

## Deploy lên Vercel

1. Push code lên GitHub.
2. Import repo trên Vercel.
3. Khai báo Environment Variables trên Vercel:
	- `NEXT_PUBLIC_API_BASE_URL`
	- `NEXT_PUBLIC_API_DEBUG` (tuỳ chọn)
4. Deploy.

Xem hướng dẫn đầy đủ tại file `DEPLOY_VERCEL.md`.

## Chạy local

```bash
npm install
npm run dev
# → http://localhost:3000
```
