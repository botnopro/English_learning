# 📋 API MAPPING - ENGLISH LEARNING APP

## Frontend ↔ Backend API Endpoints

Base URL: `https://english-learning-be.onrender.com/api`

---

## 1️⃣ AUTHENTICATION API (`/api/auth`)

| Phương thức | Endpoint | Request Body | Response | Frontend Function | Status |
|---|---|---|---|---|---|
| POST | `/auth/register` | `{ username, email, password }` | `{ message, token, user }` | `register(username, email, password)` | ✅ FIXED |
| POST | `/auth/login` | `{ email, password }` | `{ message, token, user }` | `login(email, password)` | ✅ FIXED |
| GET | `/auth/me` | (Header: Authorization) | `{ user object }` | `getMe(token)` | ✅ ADDED |

### 🔴 ISSUES FIXED:
- ✅ `login()` & `register()` now use **EMAIL** (not username)
- ✅ Added `getMe()` function to fetch current user info
- ✅ AuthModal now has email input field
- ✅ Response handling works with both `token` and `access_token`

---

## 2️⃣ WORDS API (`/api/words`)

| Phương thức | Endpoint | Request/Query | Response | Frontend Function | Status |
|---|---|---|---|---|---|
| GET | `/words` | - | `Word[]` | `getAllWords(token?)` | ✅ ADDED |
| GET | `/words/:id` | - | `Word` | `getWordById(id, token?)` | ✅ EXISTS |
| GET | `/words/review/by-topic` | `?topic=X&count=N&mineOnly=Y` | `Word[]` | `reviewByTopic(topic, count, token?, mineOnly)` | ✅ EXISTS |
| GET | `/words/review/by-level` | `?level=X&count=N&mineOnly=Y` | `Word[]` | `reviewByLevel(level, count, token?, mineOnly)` | ✅ EXISTS |
| POST | `/words` | `{ word data }` (token) | `Word` | `createWord(data, token)` | ✅ EXISTS |
| PUT | `/words/:id` | `{ word data }` (token) | `Word` | `updateWord(id, data, token)` | ✅ ADDED |
| DELETE | `/words/:id` | (token) | `{ message }` | `deleteWord(id, token)` | ✅ ADDED |

### User Vocabulary API

| Phương thức | Endpoint | Request | Response | Frontend Function | Status |
|---|---|---|---|---|---|
| POST | `/words/:id/add-to-my-vocab` | (token) | `{ message }` | `addToMyVocab(wordId, token)` | ✅ EXISTS |
| POST | `/words/:id/interact` | `{ isCorrect }` (token) | `{ message }` | `recordInteraction(wordId, isCorrect, token)` | ✅ EXISTS |

---

## 📝 CHANGES MADE

### lib/api.ts
```typescript
// ❌ BEFORE
login(username: string, password: string)
register(username: string, password: string)

// ✅ AFTER
login(email: string, password: string)
register(username: string, email: string, password: string)
getMe(token: string)
getAllWords(token?: string | null)
updateWord(id: string, data: Partial<Word>, token: string)
deleteWord(id: string, token: string)
```

### pages/index.tsx
```typescript
// ✅ Updated AuthModal
- Added email input field
- Changed login/register to use email instead of username
- Updated form validation
- Clear fields when switching tabs
- Update imports to include new functions
```

---

## 🔍 API COMPLETENESS CHECK

### Status Summary:
| Tính năng | Số API | Status |
|---|---|---|
| Authentication | 3 | ✅ Complete |
| Words Management | 7 | ✅ Complete |
| User Vocabulary | 2 | ✅ Complete |
| **TOTAL** | **12** | ✅ Complete |

---

## ⚠️ VERIFICATION CHECKLIST

- [ ] Backend `/auth/register` accepts `{ username, email, password }`
- [ ] Backend `/auth/login` accepts `{ email, password }`
- [ ] Backend `/auth/me` returns user object with Authorization header
- [ ] Backend returns `token` or `access_token` in auth endpoints
- [ ] Backend `/words` endpoint (GET) is public
- [ ] Backend `/words/:id` endpoints check `isEditable` field correctly
- [ ] Test login/register flow on frontend
- [ ] Test "Add to My Vocabulary" feature
- [ ] Test review by topic/level with `mineOnly` parameter

---

## 🚀 NEXT STEPS

1. **Test the fixes**: Run login/register flow to ensure email field is working
2. **Verify BE responses**: Check that backend returns expected data structures
3. **Test all WORD operations**: GET, POST, PUT, DELETE
4. **Add pagination** (if needed): Consider adding `page` & `limit` to `/words` endpoint
5. **Add search feature** (optional): Consider `/words/search?q=keyword`
6. **Error handling**: Ensure all error messages are user-friendly in Vietnamese

---

## 📊 API Design Notes

### Good Practices Implemented:
✅ Authorization header with Bearer token
✅ RESTful endpoint naming
✅ Consistent error handling
✅ Proper HTTP methods (GET, POST, PUT, DELETE)
✅ Query parameters for filtering

### Could Improve:
- Add pagination to `/words` for performance
- Add request/response validation
- Consider adding logout endpoint
- Add refresh token mechanism if needed

---

**Last Updated**: April 4, 2026  
**Status**: Ready for Testing
