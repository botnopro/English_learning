# 🎯 API RECOMMENDATIONS & BEST PRACTICES

## APIs cần bổ sung ngay để khớp FE hiện tại

### 1. Lấy vốn từ của tôi (đang cần cho toggle "Vốn từ của tôi")

Method: `GET`  
Endpoint: `/api/words/my-vocab?count=10`

Headers:
```json
{
  "Authorization": "Bearer <token>"
}
```

Response đề xuất:
```json
{
  "words": [
    {
      "_id": "...",
      "englishWord": "difficult",
      "vietnameseWord": "khó",
      "level": 2,
      "topics": ["education"],
      "definitions": [],
      "examples": [],
      "synonyms": []
    }
  ]
}
```

Ghi chú:
- FE hiện đã gọi endpoint này.
- Nếu chưa có endpoint này, FE sẽ fallback về API review cũ nhưng UX không ổn định bằng.

---

### 2. Thêm từ mới chỉ cần 1 ngôn ngữ (Anh hoặc Việt)

Method: `POST`  
Endpoint: `/api/words`

Headers:
```json
{
  "Authorization": "Bearer <token>",
  "Content-Type": "application/json"
}
```

Request body mới đề xuất:
```json
{
  "englishWord": "difficult",
  "vietnameseWord": "",
  "partOfSpeech": "adjective",
  "level": 2,
  "topics": ["education"]
}
```

Rule validate BE đề xuất:
- Bắt buộc `englishWord || vietnameseWord` (ít nhất 1 field có giá trị).
- Không bắt buộc cả hai cùng lúc.

Response đề xuất:
```json
{
  "message": "Tạo từ thành công",
  "word": {
    "_id": "...",
    "englishWord": "difficult",
    "vietnameseWord": "",
    "isEditable": true
  }
}
```

---

### 3. Chuẩn hóa response review để tránh lỗi undefined

Các endpoint:
- `GET /api/words/review/by-topic`
- `GET /api/words/review/by-level`

Response BE nên cố định 1 format:
```json
{
  "words": [
    {
      "_id": "...",
      "englishWord": "...",
      "vietnameseWord": "..."
    }
  ]
}
```

Hoặc giữ mảng thuần nhưng luôn đảm bảo:
- Mỗi item phải có `_id`
- Có ít nhất một trong hai: `englishWord` hoặc `vietnameseWord`

---

### 4. Truy vấn vốn từ theo chủ đề/cấp độ (khuyến nghị)

Method: `GET`  
Endpoint đề xuất:
- `/api/words/my-vocab/review/by-topic?topic=education&count=10`
- `/api/words/my-vocab/review/by-level?level=2&count=10`

Mục đích:
- Khi bật "Vốn từ của tôi" + lọc chủ đề/cấp độ thì BE xử lý đúng tập dữ liệu cá nhân.

---

### 5. Chuẩn hóa auth response để lưu đăng nhập bền vững

Method: `POST`  
Endpoint:
- `/api/auth/login`
- `/api/auth/register`

Response thống nhất:
```json
{
  "message": "OK",
  "token": "jwt-token",
  "user": {
    "_id": "...",
    "username": "...",
    "email": "..."
  }
}
```

Ghi chú:
- FE hiện đang hỗ trợ cả `token` và `access_token`, nhưng BE nên giữ 1 key cố định là `token`.

---

## Current Architecture Review

### ✅ Strengths
1. **Clean RESTful Design**: Proper HTTP methods (GET, POST, PUT, DELETE)
2. **Authorization**: Bearer token in Authorization header
3. **Clear Endpoints**: Resource-based naming convention
4. **Error Handling**: Consistent error messages in Vietnamese

### ⚠️ Areas for Improvement

---

## 🔧 RECOMMENDED IMPROVEMENTS

### 1. Add Pagination (Priority: HIGH)

**Current Issue**: 
```
GET /words - Returns ALL words (scalability problem)
```

**Recommendation**:
```typescript
// Add pagination parameters
GET /words?page=1&limit=20&sortBy=createdAt&order=desc

// Response structure
{
  data: Word[],
  total: number,
  page: number,
  limit: number,
  totalPages: number
}
```

**Frontend Implementation**:
```typescript
export async function getAllWords(page = 1, limit = 20, token?: string | null) {
  const url = `${BASE_URL}/words?page=${page}&limit=${limit}`;
  const res = await fetch(url, { headers: getHeaders(token) });
  if (!res.ok) throw new Error('Không lấy được danh sách từ');
  return res.json();
}
```

---

### 2. Add Search Functionality (Priority: HIGH)

**Recommendation**:
```typescript
// Search by word, definition, or example
GET /words/search?q=keyword&searchIn=word,definition,example

// Or simpler version:
GET /words?search=keyword

// Response: Word[]
```

**Frontend Implementation**:
```typescript
export async function searchWords(keyword: string, token?: string | null) {
  const url = `${BASE_URL}/words/search?q=${encodeURIComponent(keyword)}`;
  const res = await fetch(url, { headers: getHeaders(token) });
  if (!res.ok) throw new Error('Không tìm được từ');
  return res.json();
}
```

---

### 3. Add Logout Endpoint (Priority: MEDIUM)

**Current Gap**: No way to invalidate token on backend

**Recommendation**:
```typescript
POST /auth/logout

// Body: { token } or just clear on frontend
// Response: { message: "Đã đăng xuất" }
```

**Frontend Implementation**:
```typescript
export async function logout(token: string) {
  const res = await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: getHeaders(token),
  });
  // Clear local token regardless of response
  localStorage.removeItem('auth_token');
  if (!res.ok) console.warn('Logout failed but token cleared locally');
  return res.json();
}
```

---

### 4. Add Refresh Token Mechanism (Priority: MEDIUM)

**Current Issue**: 
- No token refresh capability
- Long-lived tokens pose security risk
- No way to extend session

**Recommendation**:
```typescript
// Register & Login return both:
{
  token: "short-lived JWT (15-30 min)",
  refreshToken: "long-lived token (7-30 days)",
  user: { ... }
}

// When token expires:
POST /auth/refresh
Body: { refreshToken }
Response: { token, refreshToken }

// Implementation:
export async function refreshToken(refreshToken: string) {
  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) throw new Error('Token refresh failed');
  return res.json();
}

// Store both tokens:
localStorage.setItem('auth_token', token);
localStorage.setItem('refresh_token', refreshToken);
```

---

### 5. Add Filtering & Sorting (Priority: MEDIUM)

**Current State**:
```
GET /words/review/by-topic?topic=X&count=N&mineOnly=Y
GET /words/review/by-level?level=X&count=N&mineOnly=Y
```

**Enhancement Recommendation**:
```typescript
// More flexible filtering
GET /words?topic=X&level=Y&minLevel=1&maxLevel=3&difficulty=easy&sort=popularity

// Multiple topics:
GET /words?topics[]=education&topics[]=work&limit=50

// Recommendation:
export async function getWords(filters: {
  topic?: string;
  level?: number;
  minLevel?: number;
  maxLevel?: number;
  mineOnly?: boolean;
  limit?: number;
  offset?: number;
}, token?: string | null) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined) params.append(key, String(value));
  });
  const url = `${BASE_URL}/words?${params}`;
  const res = await fetch(url, { headers: getHeaders(token) });
  if (!res.ok) throw new Error('Không lấy được từ');
  return res.json();
}
```

---

### 6. Add Statistics/Analytics Endpoints (Priority: LOW)

**Recommendation**:
```typescript
// User learning statistics
GET /users/me/stats
Response: {
  totalWordsSeen: number,
  wordsCorrect: number,
  wordsIncorrect: number,
  accuracy: number,
  recentActivity: Array<{
    wordId: string,
    isCorrect: boolean,
    timestamp: string
  }>,
  topicProgress: Record<string, number>
}

// Daily/weekly progress
GET /users/me/progress?period=week
Response: {
  dates: string[],
  counts: number[]  // words studied per day
}

// Frontend:
export async function getUserStats(token: string) {
  const res = await fetch(`${BASE_URL}/users/me/stats`, {
    headers: getHeaders(token)
  });
  if (!res.ok) throw new Error('Không lấy được thống kê');
  return res.json();
}
```

---

### 7. Batch Operations (Priority: LOW)

**For bulk actions**:
```typescript
// Batch add to vocabulary
POST /words/batch/add-to-vocab
Body: { wordIds: string[] }
Response: { message, count: number }

// Batch interactions
POST /words/batch/interact
Body: [
  { wordId: string, isCorrect: boolean },
  ...
]

export async function batchAddToVocab(wordIds: string[], token: string) {
  const res = await fetch(`${BASE_URL}/words/batch/add-to-vocab`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ wordIds }),
  });
  if (!res.ok) throw new Error('Batch operation failed');
  return res.json();
}
```

---

### 8. Enhanced Error Responses (Priority: MEDIUM)

**Current State**:
```json
{ "message": "Error text" }
```

**Recommendation**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email already registered",
    "field": "email",
    "details": []
  }
}
```

**Frontend Handling**:
```typescript
function getHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function handleResponse(res: Response) {
  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.error?.message || data.message || 'Lỗi không xác định';
    throw new Error(errorMsg);
  }
  return data;
}
```

---

### 9. Add Validation Error Details (Priority: MEDIUM)

**Example Response for Invalid Input**:
```json
{
  "success": false,
  "errors": [
    { "field": "email", "message": "Email không hợp lệ" },
    { "field": "password", "message": "Mật khẩu phải ít nhất 8 ký tự" }
  ]
}
```

---

### 10. API Rate Limiting (Priority: MEDIUM)

**Add Rate Limit Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

**Response when limit exceeded**:
```json
{
  "error": "Too many requests",
  "retryAfter": 60
}
```

---

## 📊 Proposed Complete API Table

| Category | Endpoint | Method | Auth | Priority | Status |
|---|---|---|---|---|---|
| **Auth** | `/auth/register` | POST | ✗ | Critical | ✅ |
| | `/auth/login` | POST | ✗ | Critical | ✅ |
| | `/auth/logout` | POST | ✅ | Medium | ❌ |
| | `/auth/me` | GET | ✅ | High | ✅ |
| | `/auth/refresh` | POST | ✗ | Medium | ❌ |
| **Words** | `/words` | GET | ✗ | High | ⚠️ (needs pagination) |
| | `/words?search=...` | GET | ✗ | High | ❌ |
| | `/words/:id` | GET | ✗ | High | ✅ |
| | `/words` | POST | ✅ | High | ✅ |
| | `/words/:id` | PUT | ✅ | High | ✅ |
| | `/words/:id` | DELETE | ✅ | High | ✅ |
| **Review** | `/words/review/by-topic` | GET | ✗ | High | ✅ |
| | `/words/review/by-level` | GET | ✗ | High | ✅ |
| **Vocab** | `/words/:id/add-to-my-vocab` | POST | ✅ | High | ✅ |
| | `/words/batch/add-to-vocab` | POST | ✅ | Medium | ❌ |
| | `/words/:id/interact` | POST | ✅ | High | ✅ |
| **Stats** | `/users/me/stats` | GET | ✅ | Medium | ❌ |
| | `/users/me/progress` | GET | ✅ | Low | ❌ |

---

## 🎯 Implementation Priority Roadmap

### Phase 1: CRITICAL (Current)
- ✅ Fix email/password authentication
- ✅ Add getMe endpoint
- ✅ Add updateWord & deleteWord

### Phase 2: HIGH (Next)
- ⚠️ Add pagination to `/words`
- ❌ Add search functionality
- ❌ Add batch operations

### Phase 3: MEDIUM (Future)
- ❌ Add logout endpoint
- ❌ Add refresh token mechanism
- ❌ Improve error responses
- ❌ Add user statistics

### Phase 4: POLISH (Enhancement)
- ❌ Add rate limiting
- ❌ Add input validation on backend
- ❌ Add request/response logging

---

## 🛡️ Security Recommendations

1. **HTTPS Only**: All API calls must use HTTPS
2. **Token Expiration**: Implement short-lived tokens (15-30 min)
3. **Refresh Tokens**: Use long-lived refresh tokens
4. **CORS**: Configure CORS properly on backend
5. **Input Validation**: Validate all inputs on backend before processing
6. **Rate Limiting**: Implement per-user rate limiting
7. **Password Security**: Minimum 8 characters, no plaintext storage
8. **Token Storage**: Consider httpOnly cookies instead of localStorage

---

## 📋 Testing Checklist

- [ ] Test auth with invalid email format
- [ ] Test auth with short password
- [ ] Test adding duplicate words
- [ ] Test updating non-owned words (should fail)
- [ ] Test deleting non-owned words (should fail)
- [ ] Test pagination with various limits
- [ ] Test search with special characters
- [ ] Test rate limiting

---

**Last Updated**: April 4, 2026
**Status**: Ready for Review
