# 🧪 TESTING GUIDE - ENGLISH LEARNING APP

## Quick Test Checklist

### Test 1: User Registration ✅
**Steps**:
1. Open app
2. Click "Tạo tài khoản" tab
3. Fill in:
   - Tên đăng nhập: `testuser123`
   - Email: `testuser@example.com`
   - Mật khẩu: `Password123`
4. Click "Đăng ký"

**Expected Result**:
- ✅ Account created
- ✅ Automatically redirected to login
- ✅ Token received and stored
- ✅ User logged in successfully

**Check**: Look at browser console → Network tab → `/auth/register` response should include `token`

---

### Test 2: User Login ✅
**Steps**:
1. Click "Đăng nhập" tab
2. Fill in:
   - Email: `testuser@example.com`
   - Mật khẩu: `Password123`
3. Click "Đăng nhập"

**Expected Result**:
- ✅ Login successful
- ✅ Modal closes
- ✅ User name displayed in header (if implemented)
- ✅ Token stored in localStorage

**Check Request Body**:
```json
{
  "email": "testuser@example.com",
  "password": "Password123"
}
```
should NOT send `username` anymore ✅

---

### Test 3: Email Field Validation
**Steps**:
1. Try register with invalid email: `notanemail`
2. Try login with empty email
3. Try with special email: `user+tag@example.com`

**Expected Result**:
- ✅ Invalid format rejected or warned
- ✅ Empty field shows validation error
- ✅ Valid emails work correctly

---

### Test 4: Get Current User (if implemented)
**Manual Test** (in browser console):
```javascript
// After login, try:
fetch('https://english-learning-be.onrender.com/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
  }
})
.then(r => r.json())
.then(d => console.log(d))
```

**Expected Response**:
```json
{
  "user": {
    "_id": "...",
    "username": "testuser123",
    "email": "testuser@example.com",
    "createdAt": "2026-04-04T..."
  }
}
```

---

### Test 5: Word Review Features
**Steps**:
1. Click "Bắt đầu ôn"
2. Select topic: "education"
3. Set count: 10
4. Click "▶ Bắt đầu ôn"

**Expected Result**:
- ✅ 10 words loaded
- ✅ Flashcards display correctly
- ✅ Mode toggle works (Anh → Việt / Việt → Anh)
- ✅ Answer reveal works
- ✅ Mark correct/incorrect works

---

### Test 6: Add to My Vocabulary
**Steps** (when logged in):
1. Start a review session
2. Reveal an answer
3. Click "＋ Thêm vào vốn từ"
4. See green checkmark appear

**Expected Result**:
- ✅ Word added to user's vocabulary
- ✅ Button shows "✓ Đã lưu"
- ✅ Success message: "✓ Đã thêm vào vốn từ của bạn!"

**Backend Verification** (Console):
```javascript
fetch('https://english-learning-be.onrender.com/api/words/[WORD_ID]/add-to-my-vocab', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(d => console.log(d))
```

---

### Test 7: My Vocabulary Filter
**Steps** (when logged in):
1. Ensure at least 3 words added to vocabulary
2. Toggle "Vốn từ của tôi"
3. Click "Bắt đầu ôn"

**Expected Result**:
- ✅ Only personal vocabulary words appear
- ✅ Shows fewer words than without filter
- ✅ Query param `mineOnly=true` sent to backend

---

### Test 8: Record Interactions
**Steps**:
1. Start a review session
2. Mark words as correct/incorrect
3. Complete session

**Expected Result**:
- ✅ Score calculated correctly
- ✅ Results screen shows:
  - Correct count
  - Incorrect count
  - Percentage
  - Appropriate emoji/message

**Backend Validation**:
Each correct/incorrect should send:
```json
{
  "wordId": "...",
  "isCorrect": true/false
}
```

---

### Test 9: Error Handling
**Scenarios**:

#### Invalid password:
```
1. Try login with wrong password
2. Should show: "Đăng nhập thất bại" or specific error
```

#### Duplicate registration:
```
1. Register same email twice
2. Should show: error message about duplicate
```

#### Network error:
```
1. Go offline
2. Try to fetch words
3. Should show user-friendly error message
```

---

## 🔍 Browser DevTools Inspection

### Network Tab Checks:

#### Request to `/auth/login`:
```json
REQUEST BODY:
{
  "email": "testuser@example.com",
  "password": "Password123"
}

RESPONSE:
{
  "message": "Login successful",
  "token": "eyJhbGc...",
  "user": {
    "_id": "...",
    "username": "testuser123",
    "email": "testuser@example.com"
  }
}

HEADERS:
Authorization: Bearer eyJhbGc...
Content-Type: application/json
```

#### Request to `/auth/register`:
```json
REQUEST BODY:
{
  "username": "newuser",
  "email": "new@example.com",
  "password": "Password123"
}

RESPONSE:
{
  "message": "Registration successful",
  "token": "eyJhbGc...",
  "user": { ... }
}
```

#### Request to `/words/review/by-topic`:
```
✅ Should NOT include username
✅ Should include Authorization header
✅ Query params:
   - topic=education
   - count=10
   - mineOnly=true (only if logged in & toggled)
```

---

## 💾 Storage Inspection

Open DevTools → Application → Local Storage → [Your Domain]:
```javascript
// Should contain (if logged in):
auth_token: "eyJhbGc..."
username: "testuser123"

// Should NOT contain:
password: (never stored)
```

---

## 🐛 Common Issues & Fixes

### Issue: "Đăng nhập thất bại" appearing
**Possible Causes**:
1. ❌ Backend not running
2. ❌ Email/password validation on BE too strict
3. ❌ User doesn't exist
4. ❌ Wrong backend URL

**Fix**:
```javascript
// Check backend URL
console.log('BASE_URL:', 'https://english-learning-be.onrender.com/api');

// Test endpoint directly
curl https://english-learning-be.onrender.com/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

---

### Issue: Email field not appearing in register
**Possible Causes**:
1. ❌ Component not re-rendered
2. ❌ Cache issue
3. ❌ Old code still running

**Fix**:
```javascript
// Hard refresh:
// Windows: Ctrl + Shift + R
// Mac: Cmd + Shift + R

// Or clear cache:
// DevTools → Application → Storage → Clear Site Data
```

---

### Issue: Added words not persisting
**Possible Causes**:
1. ❌ Token not being sent to backend
2. ❌ Backend missing `isEditable` check
3. ❌ Database error on backend

**Debug**:
```javascript
// Check if token is being sent
NETWORK TAB:
  POST /words/123/add-to-my-vocab
  Headers → Authorization: Bearer [should be here]
```

---

### Issue: mineOnly filter not working
**Possible Causes**:
1. ❌ Query param not passed correctly
2. ❌ Backend not implementing filter
3. ❌ No words in user's vocabulary

**Debug**:
```javascript
// Check query string
Network Tab → /words/review/by-topic
URL should be: .../words/review/by-topic?topic=education&count=10&mineOnly=true

// If missing mineOnly, check code:
// pages/index.tsx: mineOnly && token condition
// lib/api.ts: url building logic
```

---

## 📊 Performance Testing

### Load Testing:
```javascript
// Time login
console.time('login');
fetch('/api/auth/login', {...}).then(() => {
  console.timeEnd('login');
});
// Should be < 1000ms

// Time word fetch
console.time('fetch-words');
fetch('/api/words/review/by-topic?topic=education&count=10').then(() => {
  console.timeEnd('fetch-words');
});
// Should be < 500ms
```

---

## ✅ Final Verification Checklist

- [ ] Register works with username + email + password
- [ ] Login works with email + password (no username)
- [ ] Email field appears in both register and login
- [ ] Wrong password shows error
- [ ] Token stored in localStorage
- [ ] Bearer token sent in Authorization header
- [ ] All word operations work correctly
- [ ] Add to vocabulary works
- [ ] mineOnly filter works
- [ ] No errors in console
- [ ] Network requests show email (not username)
- [ ] Review sessions track correct/incorrect
- [ ] Results screen appears after review

---

## 🚀 Ready to Deploy?

Only after ALL checks ✅:
```bash
npm run build
npm start
# or deploy to production
```

---

**Last Updated**: April 4, 2026
**Status**: Ready for Testing
