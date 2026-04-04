const RAW_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://english-learning-be.onrender.com/api';
//   'http://localhost:5000/api';

const BASE_URL = RAW_API_BASE_URL.replace(/\/+$/, '');
const API_DEBUG = process.env.NEXT_PUBLIC_API_DEBUG !== '0';
const API_LOG_EVENT = 'app:api-log';
const API_HISTORY_LIMIT = 300;

export interface Word {
  _id: string;
  sourceEntryId?: string;
  sharedBy?: { _id?: string; username?: string };
  englishWord: string;
  vietnameseWord: string;
  pronunciation: string;
  partOfSpeech: string;
  definitions: string[];
  examples: string[];
  synonyms: string[];
  level: number;
  topics: string[];
  createdBy: { _id: string; username: string };
  isEditable: boolean;
  updatedAt: string;
  createdAt: string;
  personalLevel?: number;
  personalNote?: string;
  personalTags?: string[];
  addedAt?: string;
  lastReviewedAt?: string;
  isPublic?: boolean;
}

export interface ReviewSession {
  words: Word[];
  currentIndex: number;
  correct: number;
  incorrect: number;
  showAnswer: boolean;
  mode: 'en-to-vi' | 'vi-to-en';
}

type ApiLogMeta = Record<string, unknown>;

export interface ApiLogEntry {
  stage: 'request' | 'response' | 'error' | 'auth';
  apiName: string;
  timestamp: string;
  meta: ApiLogMeta;
}

const apiLogHistory: ApiLogEntry[] = [];

function pushApiLog(entry: ApiLogEntry) {
  apiLogHistory.push(entry);
  if (apiLogHistory.length > API_HISTORY_LIMIT) {
    apiLogHistory.splice(0, apiLogHistory.length - API_HISTORY_LIMIT);
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(API_LOG_EVENT, { detail: entry }));
  }
}

export function getApiLogHistory(): ApiLogEntry[] {
  return [...apiLogHistory];
}

export function getApiLogEventName(): string {
  return API_LOG_EVENT;
}

function logApi(stage: 'request' | 'response' | 'error' | 'auth', apiName: string, meta?: ApiLogMeta) {
  const timestamp = new Date().toISOString();
  const entry: ApiLogEntry = {
    stage,
    apiName,
    timestamp,
    meta: meta || {},
  };
  pushApiLog(entry);

  if (!API_DEBUG) return;
  console.log(`[api:${stage}] ${timestamp} ${apiName}`, meta || {});
}

function getTokenMeta(token?: string | null) {
  const safe = normalizeAuthToken(token);
  return {
    exists: Boolean(safe),
    length: safe.length,
    preview: safe ? `${safe.slice(0, 12)}...` : '(empty)',
    jwtLike: safe.split('.').length === 3,
  };
}

function requireValidToken(token: string | null | undefined, apiName: string): string {
  const safeToken = normalizeAuthToken(token);
  const meta = getTokenMeta(safeToken);
  logApi('auth', apiName, meta);

  if (!safeToken) {
    throw new Error(`[${apiName}] Token rỗng/null. Vui lòng đăng nhập lại.`);
  }

  if (safeToken.split('.').length !== 3) {
    throw new Error(`[${apiName}] Token không đúng định dạng JWT. Vui lòng đăng nhập lại.`);
  }

  return safeToken;
}

function normalizeWordsPayload(payload: any): Word[] {
  let candidates: any[] = [];

  if (Array.isArray(payload)) {
    candidates = payload;
  } else if (Array.isArray(payload?.words)) {
    candidates = payload.words;
  } else if (Array.isArray(payload?.vocab)) {
    candidates = payload.vocab;
  } else if (Array.isArray(payload?.myVocab)) {
    candidates = payload.myVocab;
  } else if (Array.isArray(payload?.items)) {
    candidates = payload.items;
  } else if (Array.isArray(payload?.data)) {
    candidates = payload.data;
  } else if (Array.isArray(payload?.data?.words)) {
    candidates = payload.data.words;
  } else if (Array.isArray(payload?.data?.vocab)) {
    candidates = payload.data.vocab;
  }

  return candidates
    .map((item: any) => {
      if (!item) return null;
      if (item.word && typeof item.word === 'object') item = item.word;
      else if (item.vocabulary && typeof item.vocabulary === 'object') item = item.vocabulary;
      else if (item.wordId && typeof item.wordId === 'object') item = item.wordId;

      const englishWord = item.personalEnglishWord || item.englishWord || item.word || '';
      const vietnameseWord = item.personalVietnameseWord || item.vietnameseWord || item.vietnamese || '';
      const pronunciation = item.pronunciation || item.ipa || '';

      if (!(item._id || item.id) || !(englishWord || vietnameseWord)) return null;

      const normalized: Word = {
        _id: item._id || item.id,
        sourceEntryId: item.sourceEntryId || item.source_entry_id || undefined,
        sharedBy: typeof item.sharedBy === 'object' ? item.sharedBy : undefined,
        englishWord,
        vietnameseWord,
        pronunciation,
        partOfSpeech: item.partOfSpeech || item.part_of_speech || '',
        definitions: Array.isArray(item.definitions) ? item.definitions : [],
        examples: Array.isArray(item.examples) ? item.examples : [],
        synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
        level: Number(item.level || 1),
        topics: Array.isArray(item.topics) ? item.topics.map((t: any) => (typeof t === 'string' ? t : t?.name || t?._id || '')).filter(Boolean) : [],
        createdBy: typeof item.createdBy === 'object'
          ? { _id: item.createdBy._id || item.createdBy.id || '', username: item.createdBy.username || '' }
          : { _id: item.created_by || '', username: '' },
        isEditable: Boolean(item.isEditable ?? true),
        updatedAt: item.updatedAt || item.updated_at || item.createdAt || item.created_at || '',
        createdAt: item.createdAt || item.created_at || '',
        personalLevel: typeof item.personalLevel === 'number' ? item.personalLevel : undefined,
        personalNote: typeof item.personalNote === 'string' ? item.personalNote : undefined,
        personalTags: Array.isArray(item.personalTags) ? item.personalTags : undefined,
        addedAt: item.addedAt || undefined,
        lastReviewedAt: item.lastReviewedAt || undefined,
        isPublic: Boolean(item.isPublic ?? item.public ?? false),
      };

      return normalized;
    })
    .filter(Boolean) as Word[];
}

function normalizeSingleWordPayload(payload: any): Word {
  const words = normalizeWordsPayload(Array.isArray(payload) ? payload : [payload]);
  if (!words.length) throw new Error('Dữ liệu từ vựng trả về không hợp lệ');
  return words[0];
}

function toBackendWordPayload(data: Partial<Word>) {
  return {
    englishWord: data.englishWord,
    vietnameseWord: data.vietnameseWord,
    pronunciation: data.pronunciation,
    partOfSpeech: data.partOfSpeech,
    definitions: data.definitions,
    examples: data.examples,
    synonyms: data.synonyms,
    level: data.level,
    topics: data.topics,
    word: data.englishWord,
    vietnamese: data.vietnameseWord,
    ipa: data.pronunciation,
  };
}

export function normalizeAuthToken(rawToken?: string | null): string {
  if (!rawToken) return '';
  let token = String(rawToken).trim();

  if ((token.startsWith('"') && token.endsWith('"')) || (token.startsWith("'") && token.endsWith("'"))) {
    token = token.slice(1, -1).trim();
  }

  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.slice(7).trim();
  }

  return token;
}

function getHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const safeToken = normalizeAuthToken(token);
  if (safeToken) headers['Authorization'] = `Bearer ${safeToken}`;
  return headers;
}

async function readApiErrorMessage(res: Response, fallback: string): Promise<string> {
  const errBody = await res.json().catch(() => ({}));
  return errBody?.message || errBody?.error || fallback;
}

async function readApiErrorBody(res: Response): Promise<any> {
  try {
    return await res.clone().json();
  } catch {
    try {
      return await res.clone().text();
    } catch {
      return null;
    }
  }
}

export async function register(username: string, email: string, password: string) {
  logApi('request', 'register', {
    method: 'POST',
    url: `${BASE_URL}/auth/register`,
    body: { username, email, passwordLength: password?.length || 0 },
  });
  const res = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    logApi('error', 'register', { status: res.status, body: err });
    throw new Error(err.message || 'Đăng ký thất bại');
  }
  logApi('response', 'register', { status: res.status, ok: res.ok });
  return res.json();
}

export async function login(email: string, password: string) {
  logApi('request', 'login', {
    method: 'POST',
    url: `${BASE_URL}/auth/login`,
    body: { email, passwordLength: password?.length || 0 },
  });
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    logApi('error', 'login', { status: res.status, body: err });
    throw new Error(err.message || 'Đăng nhập thất bại');
  }
  logApi('response', 'login', { status: res.status, ok: res.ok });
  return res.json();
}

export async function getMe(token: string) {
  const safeToken = requireValidToken(token, 'getMe');
  logApi('request', 'getMe', { method: 'GET', url: `${BASE_URL}/auth/me`, token: getTokenMeta(safeToken) });
  const res = await fetch(`${BASE_URL}/auth/me`, { headers: getHeaders(safeToken) });
  logApi('response', 'getMe', { status: res.status, ok: res.ok });
  if (!res.ok) throw new Error('Không thể lấy thông tin user');
  return res.json();
}

export async function getWordById(id: string, token?: string | null): Promise<Word> {
  logApi('request', 'getWordById', { method: 'GET', url: `${BASE_URL}/words/${id}`, token: getTokenMeta(token) });
  const res = await fetch(`${BASE_URL}/words/${id}`, { headers: getHeaders(token) });
  logApi('response', 'getWordById', { status: res.status, ok: res.ok, id });
  if (!res.ok) throw new Error('Không tìm được từ');
  return normalizeSingleWordPayload(await res.json());
}

export async function reviewByTopic(topic: string, count: number, token?: string | null, mineOnly = false): Promise<Word[]> {
  const safeToken = normalizeAuthToken(token);
  const useMyVocabRoute = mineOnly && Boolean(safeToken);
  if (mineOnly) requireValidToken(token, 'reviewByTopic[mineOnly]');
  const basePath = useMyVocabRoute ? '/words/my-vocab/review/by-topic' : '/words/review/by-topic';
  const url = `${BASE_URL}${basePath}?topic=${encodeURIComponent(topic)}&count=${count}`;
  logApi('request', 'reviewByTopic', { method: 'GET', url, mineOnly, token: getTokenMeta(token) });
  const res = await fetch(url, { headers: getHeaders(token) });
  logApi('response', 'reviewByTopic', { status: res.status, ok: res.ok, mineOnly });
  if (!res.ok) throw new Error('Không lấy được từ theo chủ đề');
  return normalizeWordsPayload(await res.json());
}

export async function reviewByLevel(level: number, count: number, token?: string | null, mineOnly = false): Promise<Word[]> {
  const safeToken = normalizeAuthToken(token);
  const useMyVocabRoute = mineOnly && Boolean(safeToken);
  if (mineOnly) requireValidToken(token, 'reviewByLevel[mineOnly]');
  const basePath = useMyVocabRoute ? '/words/my-vocab/review/by-level' : '/words/review/by-level';
  const url = `${BASE_URL}${basePath}?level=${level}&count=${count}`;
  logApi('request', 'reviewByLevel', { method: 'GET', url, mineOnly, token: getTokenMeta(token) });
  const res = await fetch(url, { headers: getHeaders(token) });
  logApi('response', 'reviewByLevel', { status: res.status, ok: res.ok, mineOnly });
  if (!res.ok) throw new Error('Không lấy được từ theo cấp độ');
  return normalizeWordsPayload(await res.json());
}

export async function getMyVocab(token: string, count = 20): Promise<Word[]> {
  const safeToken = requireValidToken(token, 'getMyVocab');

  const url = `${BASE_URL}/words/my-vocab?count=${count}`;
  logApi('request', 'getMyVocab', { method: 'GET', url, token: getTokenMeta(safeToken) });
  const res = await fetch(url, { headers: getHeaders(safeToken) });
  logApi('response', 'getMyVocab', { status: res.status, ok: res.ok, count });
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    logApi('error', 'getMyVocab', { status: res.status, body: errBody, token: getTokenMeta(safeToken) });
    if (res.status === 401) {
      const authMe = await fetch(`${BASE_URL}/auth/me`, { headers: getHeaders(safeToken) });
      logApi('response', 'getMyVocab.authMeProbe', { status: authMe.status, ok: authMe.ok });
      if (!authMe.ok) {
        throw new Error('Token không hợp lệ hoặc đã hết hạn (auth/me cũng 401). Hãy đăng nhập lại.');
      }
      throw new Error(errBody?.message || 'my-vocab trả 401 dù auth/me hợp lệ. Kiểm tra BE route /words/my-vocab.');
    }
    throw new Error(errBody?.message || `Không lấy được vốn từ của tôi (HTTP ${res.status})`);
  }
  return normalizeWordsPayload(await res.json());
}

export async function addToMyVocab(wordId: string, token: string, sourceEntryId?: string) {
  const safeToken = requireValidToken(token, 'addToMyVocab');
  const url = `${BASE_URL}/words/${wordId}/add-to-my-vocab`;
  const requestBody = sourceEntryId ? { sourceEntryId } : undefined;
  logApi('request', 'addToMyVocab', {
    method: 'POST',
    url,
    wordId,
    body: requestBody,
    token: getTokenMeta(safeToken),
  });
  const res = await fetch(`${BASE_URL}/words/${wordId}/add-to-my-vocab`, {
    method: 'POST',
    headers: getHeaders(safeToken),
    body: requestBody ? JSON.stringify(requestBody) : undefined,
  });
  logApi('response', 'addToMyVocab', { status: res.status, ok: res.ok, wordId });
  if (!res.ok) throw new Error(await readApiErrorMessage(res, 'Không thêm được từ vào vốn từ'));
  return res.json();
}

export async function updateMyVocabEntry(
  wordId: string,
  payload: {
    englishWord?: string;
    vietnameseWord?: string;
    personalLevel?: number;
    personalNote?: string;
    personalTags?: string[];
    isPublic?: boolean;
  },
  token: string,
): Promise<Word> {
  const safeToken = requireValidToken(token, 'updateMyVocabEntry');
  const url = `${BASE_URL}/words/my-vocab/${wordId}`;
  logApi('request', 'updateMyVocabEntry', {
    method: 'PUT',
    url,
    wordId,
    payload,
    token: getTokenMeta(safeToken),
  });
  const res = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(safeToken),
    body: JSON.stringify(payload),
  });
  logApi('response', 'updateMyVocabEntry', { status: res.status, ok: res.ok, wordId });
  if (!res.ok) throw new Error(await readApiErrorMessage(res, 'Không cập nhật được dữ liệu cá nhân cho vốn từ'));
  return normalizeSingleWordPayload(await res.json());
}

export async function setMyVocabVisibility(wordId: string, isPublic: boolean, token: string): Promise<Word> {
  return updateMyVocabEntry(wordId, { isPublic }, token);
}

export async function getCommunityWords(params?: {
  count?: number;
  topic?: string;
  level?: number;
}): Promise<Word[]> {
  const search = new URLSearchParams();
  if (params?.count) search.set('count', String(params.count));
  if (params?.topic) search.set('topic', params.topic);
  if (typeof params?.level === 'number') search.set('level', String(params.level));

  const query = search.toString();
  const candidateUrls = [
    `${BASE_URL}/words/community${query ? `?${query}` : ''}`,
    `${BASE_URL}/words/public${query ? `?${query}` : ''}`,
  ];

  for (const url of candidateUrls) {
    logApi('request', 'getCommunityWords', { method: 'GET', url });
    const res = await fetch(url, { headers: getHeaders() });
    logApi('response', 'getCommunityWords', { status: res.status, ok: res.ok, url });
    if (res.ok) {
      return normalizeWordsPayload(await res.json());
    }
  }

  throw new Error('Chưa có API cộng đồng. Cần BE thêm GET /words/community hoặc GET /words/public.');
}

export async function removeFromMyVocab(wordId: string, token: string) {
  const safeToken = requireValidToken(token, 'removeFromMyVocab');
  const url = `${BASE_URL}/words/my-vocab/${wordId}`;
  logApi('request', 'removeFromMyVocab', { method: 'DELETE', url, wordId, token: getTokenMeta(safeToken) });
  const res = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(safeToken),
  });
  logApi('response', 'removeFromMyVocab', { status: res.status, ok: res.ok, wordId });
  if (!res.ok) throw new Error(await readApiErrorMessage(res, 'Không bỏ được từ khỏi vốn từ của bạn'));
  return res.json();
}

export async function recordInteraction(wordId: string, isCorrect: boolean, token: string) {
  const safeToken = requireValidToken(token, 'recordInteraction');
  const url = `${BASE_URL}/words/${wordId}/interact`;
  logApi('request', 'recordInteraction', { method: 'POST', url, wordId, isCorrect, token: getTokenMeta(safeToken) });
  const res = await fetch(`${BASE_URL}/words/${wordId}/interact`, {
    method: 'POST',
    headers: getHeaders(safeToken),
    body: JSON.stringify({ isCorrect }),
  });
  logApi('response', 'recordInteraction', { status: res.status, ok: res.ok, wordId });
  if (!res.ok) throw new Error('Không ghi nhận được kết quả');
  return res.json();
}

export async function getAllWords(token?: string | null): Promise<Word[]> {
  logApi('request', 'getAllWords', { method: 'GET', url: `${BASE_URL}/words`, token: getTokenMeta(token) });
  const res = await fetch(`${BASE_URL}/words`, { headers: getHeaders(token) });
  logApi('response', 'getAllWords', { status: res.status, ok: res.ok });
  if (!res.ok) throw new Error('Không lấy được danh sách từ');
  return normalizeWordsPayload(await res.json());
}

export async function createWord(data: Partial<Word>, token: string) {
  const safeToken = requireValidToken(token, 'createWord');
  const englishWord = (data.englishWord || '').trim();
  const vietnameseWord = (data.vietnameseWord || '').trim();

  if (!englishWord || !vietnameseWord) {
    throw new Error('Cần nhập đầy đủ cả từ tiếng Anh và nghĩa tiếng Việt.');
  }

  const primaryPayload: Record<string, any> = {
    englishWord,
    vietnameseWord,
  };

  if (data.pronunciation?.trim()) primaryPayload.pronunciation = data.pronunciation.trim();
  if (data.partOfSpeech?.trim()) primaryPayload.partOfSpeech = data.partOfSpeech.trim();
  if (Array.isArray(data.definitions) && data.definitions.length > 0) primaryPayload.definitions = data.definitions;
  if (Array.isArray(data.examples) && data.examples.length > 0) primaryPayload.examples = data.examples;
  if (Array.isArray(data.synonyms) && data.synonyms.length > 0) primaryPayload.synonyms = data.synonyms;
  if (typeof data.level === 'number') primaryPayload.level = data.level;
  if (Array.isArray(data.topics) && data.topics.length > 0) primaryPayload.topics = data.topics;

  logApi('request', 'createWord', {
    method: 'POST',
    url: `${BASE_URL}/words`,
    token: getTokenMeta(safeToken),
    payload: {
      englishWord,
      vietnameseWord,
      partOfSpeech: primaryPayload.partOfSpeech,
      level: primaryPayload.level,
      topics: primaryPayload.topics,
    },
  });
  let res = await fetch(`${BASE_URL}/words`, {
    method: 'POST',
    headers: getHeaders(safeToken),
    body: JSON.stringify(primaryPayload),
  });

  if (!res.ok && (res.status === 400 || res.status === 422)) {
    const primaryErrBody = await readApiErrorBody(res);
    logApi('error', 'createWord.primaryPayload', {
      status: res.status,
      action: 'fallback-to-minimal-payload',
      body: primaryErrBody,
    });

    res = await fetch(`${BASE_URL}/words`, {
      method: 'POST',
      headers: getHeaders(safeToken),
      body: JSON.stringify({ englishWord, vietnameseWord }),
    });
  }

  if (!res.ok && (res.status === 400 || res.status === 422)) {
    const minimalErrBody = await readApiErrorBody(res);
    logApi('error', 'createWord.minimalPayload', {
      status: res.status,
      action: 'fallback-to-strict-modern-payload',
      body: minimalErrBody,
    });

    const strictModernPayload: Record<string, any> = {
      englishWord,
      vietnameseWord,
      pronunciation: primaryPayload.pronunciation || '/na/',
      partOfSpeech: primaryPayload.partOfSpeech || 'noun',
      definitions: primaryPayload.definitions || [`Basic definition for ${englishWord}.`],
      examples: primaryPayload.examples || [`I learned the word ${englishWord} today.`],
      synonyms: primaryPayload.synonyms || [],
      level: typeof primaryPayload.level === 'number' ? primaryPayload.level : 1,
      topics: Array.isArray(primaryPayload.topics) ? primaryPayload.topics : [],
    };

    res = await fetch(`${BASE_URL}/words`, {
      method: 'POST',
      headers: getHeaders(safeToken),
      body: JSON.stringify(strictModernPayload),
    });
  }

  if (!res.ok && (res.status === 400 || res.status === 422)) {
    const strictModernErrBody = await readApiErrorBody(res);
    logApi('error', 'createWord.strictModernPayload', {
      status: res.status,
      action: 'fallback-to-legacy-payload',
      body: strictModernErrBody,
    });

    res = await fetch(`${BASE_URL}/words`, {
      method: 'POST',
      headers: getHeaders(safeToken),
      body: JSON.stringify({
        word: englishWord,
        vietnamese: vietnameseWord,
        ipa: primaryPayload.pronunciation,
        partOfSpeech: primaryPayload.partOfSpeech,
        part_of_speech: primaryPayload.partOfSpeech,
        definitions: primaryPayload.definitions,
        examples: primaryPayload.examples,
        synonyms: primaryPayload.synonyms,
        level: primaryPayload.level,
        topics: primaryPayload.topics,
      }),
    });
  }

  if (!res.ok && (res.status === 400 || res.status === 422)) {
    const legacyErrBody = await readApiErrorBody(res);
    logApi('error', 'createWord.legacyPayload', {
      status: res.status,
      action: 'fallback-to-strict-legacy-payload',
      body: legacyErrBody,
    });

    res = await fetch(`${BASE_URL}/words`, {
      method: 'POST',
      headers: getHeaders(safeToken),
      body: JSON.stringify({
        word: englishWord,
        vietnamese: vietnameseWord,
        ipa: primaryPayload.pronunciation || '/na/',
        partOfSpeech: primaryPayload.partOfSpeech || 'noun',
        part_of_speech: primaryPayload.partOfSpeech || 'noun',
        definitions: primaryPayload.definitions || [`Basic definition for ${englishWord}.`],
        examples: primaryPayload.examples || [`I learned the word ${englishWord} today.`],
        synonyms: primaryPayload.synonyms || [],
        level: typeof primaryPayload.level === 'number' ? primaryPayload.level : 1,
        topics: Array.isArray(primaryPayload.topics) ? primaryPayload.topics : [],
      }),
    });
  }

  logApi('response', 'createWord', { status: res.status, ok: res.ok });
  if (!res.ok) throw new Error(await readApiErrorMessage(res, 'Không tạo được từ mới'));
  return normalizeSingleWordPayload(await res.json());
}

export async function updateWord(id: string, data: Partial<Word>, token: string) {
  const safeToken = requireValidToken(token, 'updateWord');
  logApi('request', 'updateWord', {
    method: 'PUT',
    url: `${BASE_URL}/words/${id}`,
    id,
    token: getTokenMeta(safeToken),
    payload: {
      englishWord: data.englishWord,
      vietnameseWord: data.vietnameseWord,
      partOfSpeech: data.partOfSpeech,
      level: data.level,
      topics: data.topics,
    },
  });
  let res = await fetch(`${BASE_URL}/words/${id}`, {
    method: 'PUT',
    headers: getHeaders(safeToken),
    body: JSON.stringify({
      englishWord: data.englishWord,
      vietnameseWord: data.vietnameseWord,
      pronunciation: data.pronunciation,
      partOfSpeech: data.partOfSpeech,
      definitions: data.definitions,
      examples: data.examples,
      synonyms: data.synonyms,
      level: data.level,
      topics: data.topics,
    }),
  });

  if (!res.ok && (res.status === 400 || res.status === 422)) {
    logApi('error', 'updateWord.primaryPayload', { status: res.status, action: 'fallback-to-legacy-payload', id });
    res = await fetch(`${BASE_URL}/words/${id}`, {
      method: 'PUT',
      headers: getHeaders(safeToken),
      body: JSON.stringify({
        word: data.englishWord,
        vietnamese: data.vietnameseWord,
        ipa: data.pronunciation,
        partOfSpeech: data.partOfSpeech,
        part_of_speech: data.partOfSpeech,
        definitions: data.definitions,
        examples: data.examples,
        synonyms: data.synonyms,
        level: data.level,
        topics: data.topics,
      }),
    });
  }

  logApi('response', 'updateWord', { status: res.status, ok: res.ok, id });
  if (!res.ok) throw new Error(await readApiErrorMessage(res, 'Không cập nhật được từ'));
  return normalizeSingleWordPayload(await res.json());
}

export async function deleteWord(id: string, token: string) {
  const safeToken = requireValidToken(token, 'deleteWord');
  logApi('request', 'deleteWord', { method: 'DELETE', url: `${BASE_URL}/words/${id}`, id, token: getTokenMeta(safeToken) });
  const res = await fetch(`${BASE_URL}/words/${id}`, {
    method: 'DELETE',
    headers: getHeaders(safeToken),
  });
  logApi('response', 'deleteWord', { status: res.status, ok: res.ok, id });
  if (!res.ok) throw new Error('Không xóa được từ');
  return res.json();
}

export const TOPICS = [
  'education', 'work', 'travel', 'food', 'health',
  'technology', 'science', 'art', 'sports', 'nature',
  'family', 'business', 'politics', 'culture', 'environment'
];

export const LEVELS = [1, 2, 3, 4, 5];
