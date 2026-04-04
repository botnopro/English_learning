import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import {
  Word, login, register, reviewByTopic, reviewByLevel,
  addToMyVocab, recordInteraction, TOPICS, LEVELS, createWord, getMe, getMyVocab, normalizeAuthToken, updateMyVocabEntry, removeFromMyVocab,
  setMyVocabVisibility, getCommunityWords,
  getApiLogHistory, getApiLogEventName, ApiLogEntry
} from '../lib/api';

const RANDOM_TOPIC_VALUE = '__RANDOM_TOPIC__';
const RANDOM_LEVEL_VALUE = -1;
const RANDOM_COUNT_VALUE = -1;
const RANDOM_MODE_VALUE = 'random';

// ─── Auth Modal ───────────────────────────────────────────────────────────────
function AuthModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (token: string, username: string) => void }) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (tab === 'login') {
      if (!email || !password) { setError('Vui lòng nhập đầy đủ thông tin'); return; }
    } else {
      if (!username || !email || !password) { setError('Vui lòng nhập đầy đủ thông tin'); return; }
    }
    setLoading(true); setError('');
    try {
      if (tab === 'login') {
        const data = await login(email, password);
        onSuccess(data.token || data.access_token, data.user?.username || email);
      } else {
        await register(username, email, password);
        const data = await login(email, password);
        onSuccess(data.token || data.access_token, data.user?.username || username);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2 className="modal-title">{tab === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản'}</h2>
        <p className="modal-sub">{tab === 'login' ? 'Đăng nhập để học từ vựng cá nhân' : 'Bắt đầu hành trình học tiếng Anh'}</p>

        <div className="tabs" style={{ marginBottom: '1.5rem' }}>
          <button className={`tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); setUsername(''); setEmail(''); setPassword(''); }}>Đăng nhập</button>
          <button className={`tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); setUsername(''); setEmail(''); setPassword(''); }}>Đăng ký</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {tab === 'register' && (
          <div className="form-group">
            <label className="form-label">Tên đăng nhập</label>
            <input className="form-input" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="Tên đăng nhập" onKeyDown={e => e.key === 'Enter' && handle()} />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com" onKeyDown={e => e.key === 'Enter' && handle()} />
        </div>

        <div className="form-group">
          <label className="form-label">Mật khẩu</label>
          <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handle()} />
        </div>

        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.5rem' }}>
          <button className="btn btn-ink btn-lg" style={{ flex: 1 }} onClick={handle} disabled={loading}>
            {loading ? '⏳ Đang xử lý...' : tab === 'login' ? 'Đăng nhập' : 'Đăng ký'}
          </button>
          <button className="btn btn-ghost" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
}

// ─── Flash Card ───────────────────────────────────────────────────────────────
interface FlashCardProps {
  word: Word;
  index: number;
  total: number;
  showAnswer: boolean;
  answerResult: boolean | null;
  onSubmitAnswer: (answer: string) => void;
  onNext: () => void;
  isLast: boolean;
  mode: 'en-to-vi' | 'vi-to-en';
}

function normalizeForCompare(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function FlashCard({ word, index, total, showAnswer, answerResult, onSubmitAnswer, onNext, isLast, mode }: FlashCardProps) {
  const [answerInput, setAnswerInput] = useState('');

  useEffect(() => {
    setAnswerInput('');
  }, [word?._id]);

  if (!word) {
    return (
      <div className="card">
        <p>Không có dữ liệu từ vựng hợp lệ. Vui lòng chọn bộ lọc khác.</p>
      </div>
    );
  }

  const question = mode === 'en-to-vi' ? word.englishWord : word.vietnameseWord;
  const answer = mode === 'en-to-vi' ? word.vietnameseWord : word.englishWord;

  const hasExact = useMemo(() => {
    const normalizedAnswer = normalizeForCompare(answer || '');
    const normalizedInput = normalizeForCompare(answerInput || '');
    return normalizedAnswer.length > 0 && normalizedInput.length > 0 && normalizedAnswer === normalizedInput;
  }, [answer, answerInput]);

  const playAudio = async () => {
    const dynamicWord: any = word as any;
    const audioUrl = dynamicWord.audioUrl || dynamicWord.audio || dynamicWord.audioPath;
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      await audio.play();
      return;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utter = new SpeechSynthesisUtterance(word.englishWord || answer || question);
      utter.lang = 'en-US';
      utter.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    }
  };

  return (
    <div className="flashcard-wrapper">
      <div className="flashcard">
        <span className="card-number">{index + 1} / {total}</span>
        <span className="card-mode-badge">{mode === 'en-to-vi' ? '🇬🇧 → 🇻🇳' : '🇻🇳 → 🇬🇧'}</span>

        <div style={{ marginBottom: '0.5rem' }}>
          <span className={`level-badge level-${word.level}`}>Cấp {word.level}</span>
        </div>

        <div className="card-question">{question}</div>

        {mode === 'en-to-vi' && word.pronunciation && (
          <div className="card-pronunciation">{word.pronunciation}</div>
        )}

        <span className="card-pos">{word.partOfSpeech}</span>

        {!showAnswer ? (
          <div style={{ width: '100%' }}>
            <div className="form-group" style={{ marginBottom: '0.6rem' }}>
              <label className="form-label">Nhập đáp án của bạn</label>
              <input
                className="form-input"
                value={answerInput}
                onChange={e => setAnswerInput(e.target.value)}
                placeholder={mode === 'en-to-vi' ? 'Nhập nghĩa tiếng Việt...' : 'Nhập từ tiếng Anh...'}
                onKeyDown={e => {
                  if (e.key === 'Enter') onSubmitAnswer(answerInput);
                }}
              />
            </div>
            <button className="btn btn-ink btn-lg" onClick={() => onSubmitAnswer(answerInput)} disabled={!answerInput.trim()}>
              Kiểm tra
            </button>
            {answerInput.trim() && (
              <p className="hint-text">So khớp nhanh: {hasExact ? 'Khớp chính xác' : 'Chưa khớp chính xác'}</p>
            )}
          </div>
        ) : (
          <div className="card-answer">
            <div className="answer-main" style={{ marginBottom: '0.35rem' }}>
              {answerResult ? '✓ Đúng - Bạn đã nhớ' : '✗ Sai - Bạn chưa nhớ'}
            </div>
            <div className="answer-main">{answer}</div>
            <div style={{ marginBottom: '0.6rem', color: '#555', fontSize: '0.9rem' }}>
              Đáp án của bạn: {answerInput || '(trống)'}
            </div>
            {word.pronunciation && (
              <div style={{ marginBottom: '0.5rem', color: '#555' }}>Phát âm: {word.pronunciation}</div>
            )}
            <div style={{ marginBottom: '0.8rem' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { void playAudio(); }}>🔊 Nghe phát âm</button>
            </div>
            <div className="answer-details">
              {word.definitions.length > 0 && (
                <div className="detail-row">
                  <span className="detail-label">Định nghĩa</span>
                  <span className="detail-value">{word.definitions[0]}</span>
                </div>
              )}
              {word.examples.length > 0 && (
                <div className="detail-row">
                  <span className="detail-label">Ví dụ</span>
                  <span className="detail-value" style={{ fontStyle: 'italic', color: '#555' }}>{word.examples[0]}</span>
                </div>
              )}
              {word.synonyms.length > 0 && (
                <div className="detail-row">
                  <span className="detail-label">Đồng nghĩa</span>
                  <span className="detail-value">
                    <span className="pills">
                      {word.synonyms.map(s => <span key={s} className="pill">{s}</span>)}
                    </span>
                  </span>
                </div>
              )}
              {word.topics.length > 0 && (
                <div className="detail-row">
                  <span className="detail-label">Chủ đề</span>
                  <span className="detail-value">{word.topics.join(', ')}</span>
                </div>
              )}
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={onNext}>{isLast ? 'Xem kết quả' : 'Từ tiếp theo'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Result Screen ─────────────────────────────────────────────────────────────
function ResultScreen({ correct, total, onRestart, onNewSession }: {
  correct: number; total: number; onRestart: () => void; onNewSession: () => void;
}) {
  const pct = Math.round((correct / total) * 100);
  const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '👍' : pct >= 40 ? '📚' : '💪';
  const msg = pct >= 80 ? 'Xuất sắc!' : pct >= 60 ? 'Tốt lắm!' : pct >= 40 ? 'Cần ôn thêm' : 'Hãy cố gắng hơn!';

  return (
    <div className="card result-card">
      <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>{emoji}</div>
      <h2 className="section-title">{msg}</h2>
      <div className="result-score">{pct}%</div>
      <p className="result-label">Đúng <strong>{correct}</strong> / {total} từ</p>

      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}>
        <button className="btn btn-ink btn-lg" onClick={onRestart}>🔁 Ôn lại session này</button>
        <button className="btn btn-ghost btn-lg" onClick={onNewSession}>🆕 Chọn session mới</button>
      </div>
    </div>
  );
}

// ─── Review Panel ──────────────────────────────────────────────────────────────
function ReviewPanel({ token }: { token: string | null }) {
  const [filterMode, setFilterMode] = useState<'topic' | 'level'>('topic');
  const [topic, setTopic] = useState<string>('education');
  const [level, setLevel] = useState<number>(3);
  const [count, setCount] = useState<number>(10);
  const [mineOnly, setMineOnly] = useState(false);
  const [cardMode, setCardMode] = useState<'en-to-vi' | 'vi-to-en' | 'random'>('en-to-vi');

  const [words, setWords] = useState<Word[]>([]);
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answerResult, setAnswerResult] = useState<boolean | null>(null);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [myVocabList, setMyVocabList] = useState<Word[]>([]);
  const [myVocabLoading, setMyVocabLoading] = useState(false);
  const [myVocabError, setMyVocabError] = useState('');
  const [editingWordId, setEditingWordId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    englishWord: '',
    vietnameseWord: '',
  });
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [inlineAddForm, setInlineAddForm] = useState({
    englishWord: '',
    vietnameseWord: '',
    pronunciation: '',
    partOfSpeech: 'noun',
    level: 3,
    topics: '',
    definitions: '',
    examples: '',
    synonyms: '',
  });

  const parseCsv = (raw: string) => raw.split(',').map(s => s.trim()).filter(Boolean);

  const loadMyVocabList = async (safeTokenOverride?: string) => {
    if (!token && !safeTokenOverride) return;
    const safeToken = safeTokenOverride || normalizeAuthToken(token);
    if (!safeToken) return;

    setMyVocabLoading(true);
    setMyVocabError('');
    try {
      const list = await getMyVocab(safeToken, 200);
      setMyVocabList(list);
    } catch (e: any) {
      setMyVocabError(e?.message || 'Không tải được danh sách vốn từ của bạn');
    } finally {
      setMyVocabLoading(false);
    }
  };

  const beginEditWord = (w: Word) => {
    setEditingWordId(w._id);
    setEditForm({
      englishWord: w.englishWord || '',
      vietnameseWord: w.vietnameseWord || '',
    });
  };

  const cancelEditWord = () => {
    setEditingWordId(null);
  };

  const saveEditWord = async (id: string) => {
    if (!token) return;
    try {
      await updateMyVocabEntry(id, {
        englishWord: editForm.englishWord.trim(),
        vietnameseWord: editForm.vietnameseWord.trim(),
      }, token);
      setEditingWordId(null);
      await loadMyVocabList();
      setWords([]);
      setDone(false);
      setError('');
    } catch (e: any) {
      setMyVocabError(e?.message || 'Không sửa được từ');
    }
  };

  const removeWord = async (w: Word) => {
    if (!token) return;
    const ok = window.confirm(`Bỏ từ \"${w.englishWord || w.vietnameseWord}\" khỏi vốn từ của bạn?`);
    if (!ok) return;
    try {
      await removeFromMyVocab(w._id, token);
      await loadMyVocabList();
      setWords([]);
      setDone(false);
      setError('');
    } catch (e: any) {
      setMyVocabError(e?.message || 'Không bỏ được từ khỏi vốn từ');
    }
  };

  const createInlineWord = async () => {
    if (!token) return;
    if (!inlineAddForm.englishWord.trim() || !inlineAddForm.vietnameseWord.trim()) {
      setMyVocabError('Cần nhập đầy đủ cả từ tiếng Anh và nghĩa tiếng Việt để thêm mới.');
      return;
    }
    try {
      const created = await createWord({
        englishWord: inlineAddForm.englishWord.trim() || undefined,
        vietnameseWord: inlineAddForm.vietnameseWord.trim() || undefined,
        pronunciation: inlineAddForm.pronunciation.trim() || undefined,
        partOfSpeech: inlineAddForm.partOfSpeech,
        level: Number(inlineAddForm.level),
        topics: parseCsv(inlineAddForm.topics),
        definitions: inlineAddForm.definitions.split('|').map(s => s.trim()).filter(Boolean),
        examples: inlineAddForm.examples.split('|').map(s => s.trim()).filter(Boolean),
        synonyms: parseCsv(inlineAddForm.synonyms),
      }, token);
      if (created?._id) {
        try {
          await addToMyVocab(created._id, token);
        } catch {
          // Ignore duplicate add if backend auto-links new words to my-vocab.
        }
      }
      setInlineAddForm({
        englishWord: '',
        vietnameseWord: '',
        pronunciation: '',
        partOfSpeech: 'noun',
        level: 3,
        topics: '',
        definitions: '',
        examples: '',
        synonyms: '',
      });
      setShowInlineAdd(false);
      await loadMyVocabList();
      setWords([]);
      setDone(false);
      setError('');
    } catch (e: any) {
      setMyVocabError(e?.message || 'Không thêm được từ mới');
    }
  };

  const toggleVisibility = async (w: Word) => {
    if (!token) return;
    try {
      await setMyVocabVisibility(w._id, !Boolean(w.isPublic), token);
      await loadMyVocabList();
    } catch (e: any) {
      setMyVocabError(e?.message || 'Không cập nhật được trạng thái public/private');
    }
  };

  const downloadMyVocab = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      total: myVocabList.length,
      words: myVocabList,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `my-vocab-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const syncAddedIdsFromMyVocab = async (safeToken: string, currentWords: Word[]) => {
    try {
      const mine = await getMyVocab(safeToken, 200);
      const mineIds = new Set(mine.map(w => w._id));
      const currentIds = new Set(currentWords.map(w => w._id));
      const merged = new Set<string>();
      for (const id of mineIds) {
        if (currentIds.has(id)) merged.add(id);
      }
      setAddedIds(merged);
    } catch {
      setAddedIds(new Set());
    }
  };

  const randomPick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const startSession = async (mineOnlyOverride?: boolean) => {
    setLoading(true); setError(''); setDone(false);
    setIdx(0); setCorrect(0); setIncorrect(0); setShowAnswer(false); setAnswerResult(null);
    try {
      const effectiveMineOnly = typeof mineOnlyOverride === 'boolean' ? mineOnlyOverride : mineOnly;
      const effectiveTopic = topic === RANDOM_TOPIC_VALUE ? randomPick(TOPICS) : topic;
      const effectiveLevel = level === RANDOM_LEVEL_VALUE ? randomPick(LEVELS) : level;
      const effectiveCount = count === RANDOM_COUNT_VALUE ? randomPick([5, 10, 15, 20]) : count;
      const effectiveMode = cardMode === RANDOM_MODE_VALUE ? randomPick(['en-to-vi', 'vi-to-en'] as const) : cardMode;

      let fetched: Word[];
      if (effectiveMineOnly && token) {
        const safeToken = normalizeAuthToken(token);
        console.log('[my-vocab] calling with token:', {
          exists: Boolean(safeToken),
          preview: safeToken ? `${safeToken.slice(0, 12)}...` : '(empty)',
          length: safeToken.length,
        });
        try {
          fetched = await getMyVocab(safeToken, effectiveCount);
        } catch {
          if (filterMode === 'topic') {
            fetched = await reviewByTopic(effectiveTopic, effectiveCount, safeToken, true);
          } else {
            fetched = await reviewByLevel(effectiveLevel, effectiveCount, safeToken, true);
          }
        }
      } else if (filterMode === 'topic') {
        fetched = await reviewByTopic(effectiveTopic, effectiveCount, token, false);
      } else {
        fetched = await reviewByLevel(effectiveLevel, effectiveCount, token, false);
      }

      setCardMode(effectiveMode);

      if (!fetched || fetched.length === 0) {
        setError(effectiveMineOnly
          ? 'Vốn từ của bạn đang trống. Hãy bấm "Thêm vào vốn từ" ở thẻ ôn tập trước.'
          : 'Không tìm thấy từ nào. Hãy thử chủ đề/cấp độ khác!');
        setWords([]);
        setAddedIds(new Set());
      } else {
        setWords(fetched);
        if (token) {
          const safeToken = normalizeAuthToken(token);
          if (effectiveMineOnly) {
            setAddedIds(new Set(fetched.map(w => w._id)));
          } else if (safeToken) {
            await syncAddedIdsFromMyVocab(safeToken, fetched);
          }
        }
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const handleSubmitAnswer = async (answerInput: string) => {
    if (!words[idx]) return;
    const expected = (cardMode === 'vi-to-en' ? words[idx].englishWord : words[idx].vietnameseWord) || '';
    const normalize = (s: string) =>
      (s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');

    const isCorrect = normalize(answerInput) === normalize(expected);
    setAnswerResult(isCorrect);
    setShowAnswer(true);
    if (isCorrect) setCorrect(c => c + 1);
    else setIncorrect(c => c + 1);

    if (token && words[idx]) {
      try { await recordInteraction(words[idx]._id, isCorrect, token); } catch {}
    }
  };

  const advance = () => {
    if (idx + 1 >= words.length) { setDone(true); }
    else { setIdx(i => i + 1); setShowAnswer(false); setAnswerResult(null); }
  };

  const restartSession = () => {
    setIdx(0); setCorrect(0); setIncorrect(0); setShowAnswer(false); setAnswerResult(null); setDone(false);
  };

  const progress = words.length > 0 ? (idx / words.length) * 100 : 0;
  const currentWord = words[idx];

  if (done && words.length > 0) {
    return <ResultScreen correct={correct} total={words.length} onRestart={restartSession} onNewSession={() => { setWords([]); setDone(false); }} />;
  }

  return (
    <div>
      {words.length === 0 ? (
        <>
          {/* Filter panel */}
          <div className="filter-panel">
            <div className="filter-field">
              <label className="form-label">Lọc theo</label>
              <div className="tabs" style={{ margin: 0 }}>
                <button className={`tab ${filterMode === 'topic' ? 'active' : ''}`} onClick={() => setFilterMode('topic')}>Chủ đề</button>
                <button className={`tab ${filterMode === 'level' ? 'active' : ''}`} onClick={() => setFilterMode('level')}>Cấp độ</button>
              </div>
            </div>

            {filterMode === 'topic' ? (
              <div className="filter-field">
                <label className="form-label">Chủ đề</label>
                <select className="form-select" value={topic} onChange={e => setTopic(e.target.value)}>
                  <option value={RANDOM_TOPIC_VALUE}>Ngẫu nhiên</option>
                  {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            ) : (
              <div className="filter-field">
                <label className="form-label">Cấp độ (1–5)</label>
                <select className="form-select" value={level} onChange={e => setLevel(+e.target.value)}>
                  <option value={RANDOM_LEVEL_VALUE}>Ngẫu nhiên</option>
                  {LEVELS.map(l => <option key={l} value={l}>Cấp {l}</option>)}
                </select>
              </div>
            )}

            <div className="filter-field">
              <label className="form-label">Số từ</label>
              <select className="form-select" value={count} onChange={e => setCount(+e.target.value)}>
                <option value={RANDOM_COUNT_VALUE}>Ngẫu nhiên</option>
                {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n} từ</option>)}
              </select>
            </div>

            <div className="filter-field">
              <label className="form-label">Chế độ hỏi</label>
              <select className="form-select" value={cardMode} onChange={e => setCardMode(e.target.value as 'en-to-vi' | 'vi-to-en' | 'random')}>
                <option value={RANDOM_MODE_VALUE}>Ngẫu nhiên</option>
                <option value="en-to-vi">Anh → Việt</option>
                <option value="vi-to-en">Việt → Anh</option>
              </select>
            </div>

            {token && (
              <div className="filter-field" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '0.15rem' }}>
                <label
                  className="mode-toggle"
                  onClick={() => {
                    const nextMineOnly = !mineOnly;
                    setMineOnly(nextMineOnly);
                    if (nextMineOnly) {
                      setWords([]);
                      setDone(false);
                      setError('');
                      void loadMyVocabList();
                    }
                  }}
                >
                  <div className={`toggle ${mineOnly ? 'on' : ''}`}><div className="toggle-dot" /></div>
                  Vốn từ của tôi
                </label>
              </div>
            )}

            <div className="filter-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button className="btn btn-ink" onClick={() => { void startSession(); }} disabled={loading}>
                {loading ? '⏳ Đang tải...' : '▶ Bắt đầu ôn'}
              </button>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          {token && mineOnly && (
            <div className="card" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem', gap: '0.8rem', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontFamily: 'Playfair Display', fontSize: '1.15rem' }}>Vốn từ của tôi ({myVocabList.length})</h3>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-ghost btn-sm" onClick={downloadMyVocab} disabled={myVocabList.length === 0}>Tải list của tôi</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { void loadMyVocabList(); }} disabled={myVocabLoading}>Làm mới</button>
                  <button className="btn btn-ink btn-sm" onClick={() => setShowInlineAdd(v => !v)}>{showInlineAdd ? 'Đóng thêm từ' : '＋ Thêm từ mới'}</button>
                </div>
              </div>

              {showInlineAdd && (
                <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.8rem', marginBottom: '0.8rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                    <input className="form-input" placeholder="Từ tiếng Anh" value={inlineAddForm.englishWord} onChange={e => setInlineAddForm(f => ({ ...f, englishWord: e.target.value }))} />
                    <input className="form-input" placeholder="Nghĩa tiếng Việt" value={inlineAddForm.vietnameseWord} onChange={e => setInlineAddForm(f => ({ ...f, vietnameseWord: e.target.value }))} />
                    <input className="form-input" placeholder="Phát âm" value={inlineAddForm.pronunciation} onChange={e => setInlineAddForm(f => ({ ...f, pronunciation: e.target.value }))} />
                    <input className="form-input" placeholder="Loại từ (noun/verb...)" value={inlineAddForm.partOfSpeech} onChange={e => setInlineAddForm(f => ({ ...f, partOfSpeech: e.target.value }))} />
                    <input className="form-input" placeholder="Cấp độ (1-5)" type="number" min={1} max={5} value={inlineAddForm.level} onChange={e => setInlineAddForm(f => ({ ...f, level: Number(e.target.value || 1) }))} />
                    <input className="form-input" placeholder="Chủ đề (phân tách dấu phẩy)" value={inlineAddForm.topics} onChange={e => setInlineAddForm(f => ({ ...f, topics: e.target.value }))} />
                    <input className="form-input" placeholder="Định nghĩa (phân tách bằng |)" value={inlineAddForm.definitions} onChange={e => setInlineAddForm(f => ({ ...f, definitions: e.target.value }))} />
                    <input className="form-input" placeholder="Ví dụ (phân tách bằng |)" value={inlineAddForm.examples} onChange={e => setInlineAddForm(f => ({ ...f, examples: e.target.value }))} />
                    <input className="form-input" placeholder="Đồng nghĩa (phân tách dấu phẩy)" value={inlineAddForm.synonyms} onChange={e => setInlineAddForm(f => ({ ...f, synonyms: e.target.value }))} />
                  </div>
                  <div style={{ marginTop: '0.6rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn btn-ink btn-sm" onClick={() => { void createInlineWord(); }}>Lưu từ mới</button>
                  </div>
                </div>
              )}

              {myVocabError && <div className="alert alert-error" style={{ marginBottom: '0.8rem' }}>{myVocabError}</div>}

              {myVocabLoading ? (
                <p style={{ margin: 0 }}>Đang tải vốn từ...</p>
              ) : myVocabList.length === 0 ? (
                <p style={{ margin: 0, color: '#666' }}>Bạn chưa lưu từ nào.</p>
              ) : (
                <div style={{ display: 'grid', gap: '0.6rem' }}>
                  {myVocabList.map(w => (
                    <div key={w._id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem' }}>
                      {editingWordId === w._id ? (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <input className="form-input" value={editForm.englishWord} onChange={e => setEditForm(f => ({ ...f, englishWord: e.target.value }))} placeholder="Từ tiếng Anh" />
                            <input className="form-input" value={editForm.vietnameseWord} onChange={e => setEditForm(f => ({ ...f, vietnameseWord: e.target.value }))} placeholder="Nghĩa tiếng Việt" />
                          </div>
                          <div style={{ marginTop: '0.6rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost btn-sm" onClick={cancelEditWord}>Hủy</button>
                            <button className="btn btn-primary btn-sm" onClick={() => { void saveEditWord(w._id); }}>Lưu sửa</button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.7rem', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontWeight: 700 }}>{w.englishWord || '(trống)'} {w.vietnameseWord ? `- ${w.vietnameseWord}` : ''}</div>
                              <div style={{ color: '#666', fontSize: '0.86rem' }}>{w.partOfSpeech || 'N/A'} | Cấp {w.level}</div>
                              {w.pronunciation && <div style={{ color: '#666', fontSize: '0.86rem' }}>{w.pronunciation}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => { void toggleVisibility(w); }}
                                title="Chuyển public/private cho từ này"
                              >
                                {w.isPublic ? 'Public' : 'Private'}
                              </button>
                              <button className="btn btn-ghost btn-sm" onClick={() => beginEditWord(w)}>Sửa</button>
                              <button className="btn btn-danger btn-sm" onClick={() => { void removeWord(w); }}>Bỏ lưu</button>
                            </div>
                          </div>
                          {w.topics.length > 0 && (
                            <div style={{ marginTop: '0.45rem', color: '#666', fontSize: '0.84rem' }}>Chủ đề: {w.topics.join(', ')}</div>
                          )}
                          <div style={{ marginTop: '0.35rem', color: '#666', fontSize: '0.84rem' }}>
                            Personal level: {w.personalLevel || '-'}
                            {w.personalTags && w.personalTags.length > 0 ? ` | Tags: ${w.personalTags.join(', ')}` : ''}
                          </div>
                          {w.personalNote && (
                            <div style={{ marginTop: '0.35rem', color: '#666', fontSize: '0.84rem' }}>Ghi chú: {w.personalNote}</div>
                          )}
                          {(w.addedAt || w.lastReviewedAt) && (
                            <div style={{ marginTop: '0.35rem', color: '#888', fontSize: '0.8rem' }}>
                              {w.addedAt ? `Đã thêm: ${new Date(w.addedAt).toLocaleString()}` : ''}
                              {w.addedAt && w.lastReviewedAt ? ' | ' : ''}
                              {w.lastReviewedAt ? `Ôn gần nhất: ${new Date(w.lastReviewedAt).toLocaleString()}` : ''}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          <div className="empty">
            <div className="empty-icon">📖</div>
            <p style={{ fontSize: '1.05rem', fontWeight: 600, color: '#555', marginBottom: '0.4rem' }}>Sẵn sàng ôn tập?</p>
            <p>Chọn bộ lọc và nhấn <strong>Bắt đầu ôn</strong> để học từ vựng</p>
            {!token && <p style={{ marginTop: '0.8rem', color: '#aaa', fontSize: '0.88rem' }}>Đăng nhập để ôn vốn từ cá nhân & lưu tiến trình</p>}
          </div>
        </>
      ) : (
        <>
          {/* Progress */}
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
          <div className="stats-row">
            <span className="stat-chip stat-total">📝 {idx + 1}/{words.length}</span>
            <span className="stat-chip stat-correct">✓ {correct}</span>
            <span className="stat-chip stat-incorrect">✗ {incorrect}</span>
          </div>

          <FlashCard
            word={currentWord}
            index={idx}
            total={words.length}
            showAnswer={showAnswer}
            answerResult={answerResult}
            onSubmitAnswer={handleSubmitAnswer}
            onNext={advance}
            isLast={idx + 1 >= words.length}
            mode={cardMode === RANDOM_MODE_VALUE ? 'en-to-vi' : cardMode}
          />

          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { setWords([]); setDone(false); }}>← Chọn bộ lọc khác</button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Add Word Panel ────────────────────────────────────────────────────────────
function AddWordPanel({ token }: { token: string }) {
  const [form, setForm] = useState({
    englishWord: '', vietnameseWord: '', pronunciation: '',
    partOfSpeech: 'noun', definitions: '', examples: '', synonyms: '',
    level: 3, topics: [] as string[]
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const toggleTopic = (t: string) => {
    setForm(f => ({ ...f, topics: f.topics.includes(t) ? f.topics.filter(x => x !== t) : [...f.topics, t] }));
  };

  const handle = async () => {
    if (!form.englishWord.trim() || !form.vietnameseWord.trim()) {
      setErr('Bạn cần nhập đầy đủ cả từ tiếng Anh và nghĩa tiếng Việt');
      return;
    }

    setLoading(true); setErr(''); setMsg('');
    try {
      await createWord({
        englishWord: form.englishWord.trim() || undefined,
        vietnameseWord: form.vietnameseWord.trim() || undefined,
        pronunciation: form.pronunciation.trim() || undefined,
        partOfSpeech: form.partOfSpeech,
        definitions: form.definitions ? [form.definitions.trim()] : [],
        examples: form.examples ? [form.examples.trim()] : [],
        synonyms: form.synonyms ? form.synonyms.split(',').map(s => s.trim()).filter(Boolean) : [],
        level: form.level,
        topics: form.topics,
      }, token);
      setMsg('✓ Thêm từ thành công!');
      setForm({ englishWord: '', vietnameseWord: '', pronunciation: '', partOfSpeech: 'noun', definitions: '', examples: '', synonyms: '', level: 3, topics: [] });
    } catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="card">
      <h3 style={{ fontFamily: 'Playfair Display', fontSize: '1.3rem', marginBottom: '1.5rem' }}>Thêm từ mới</h3>

      {msg && <div className="alert alert-success">{msg}</div>}
      {err && <div className="alert alert-error">{err}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div className="form-group">
          <label className="form-label">Từ tiếng Anh *</label>
          <input className="form-input" value={form.englishWord} onChange={e => setForm(f => ({ ...f, englishWord: e.target.value }))} placeholder="e.g. difficult" />
        </div>
        <div className="form-group">
          <label className="form-label">Nghĩa tiếng Việt *</label>
          <input className="form-input" value={form.vietnameseWord} onChange={e => setForm(f => ({ ...f, vietnameseWord: e.target.value }))} placeholder="e.g. khó khăn" />
        </div>
        <div className="form-group">
          <label className="form-label">Phát âm</label>
          <input className="form-input" value={form.pronunciation} onChange={e => setForm(f => ({ ...f, pronunciation: e.target.value }))} placeholder="e.g. /ˈdɪf.ɪ.kəlt/" />
        </div>
        <div className="form-group">
          <label className="form-label">Loại từ</label>
          <select className="form-select" value={form.partOfSpeech} onChange={e => setForm(f => ({ ...f, partOfSpeech: e.target.value }))}>
            {['noun','verb','adjective','adverb','preposition','conjunction','interjection'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Cấp độ (1–5)</label>
          <select className="form-select" value={form.level} onChange={e => setForm(f => ({ ...f, level: +e.target.value }))}>
            {LEVELS.map(l => <option key={l} value={l}>Cấp {l}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Đồng nghĩa (cách nhau bởi dấu phẩy)</label>
          <input className="form-input" value={form.synonyms} onChange={e => setForm(f => ({ ...f, synonyms: e.target.value }))} placeholder="e.g. hard, challenging" />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Định nghĩa</label>
        <input className="form-input" value={form.definitions} onChange={e => setForm(f => ({ ...f, definitions: e.target.value }))} placeholder="Mô tả ngắn gọn nghĩa của từ" />
      </div>
      <div className="form-group">
        <label className="form-label">Ví dụ</label>
        <input className="form-input" value={form.examples} onChange={e => setForm(f => ({ ...f, examples: e.target.value }))} placeholder="Câu ví dụ sử dụng từ này" />
      </div>

      <div className="form-group">
        <label className="form-label">Chủ đề</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.4rem' }}>
          {TOPICS.map(t => (
            <button key={t} onClick={() => toggleTopic(t)}
              style={{
                padding: '0.3rem 0.9rem', borderRadius: '100px', border: '1.5px solid',
                cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'DM Sans',
                background: form.topics.includes(t) ? 'var(--sage-dark)' : 'white',
                color: form.topics.includes(t) ? 'white' : 'var(--ink)',
                borderColor: form.topics.includes(t) ? 'var(--sage-dark)' : 'var(--border)',
                transition: 'all 0.15s'
              }}>{t}</button>
          ))}
        </div>
      </div>

      <button className="btn btn-ink btn-lg" onClick={handle} disabled={loading} style={{ marginTop: '0.5rem' }}>
        {loading ? '⏳ Đang lưu...' : '＋ Thêm từ'}
      </button>
    </div>
  );
}

// ─── Community Panel ─────────────────────────────────────────────────────────
function CommunityPanel({ token }: { token: string | null }) {
  const [communityWords, setCommunityWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [communityTopic, setCommunityTopic] = useState<string>('');
  const [communityLevel, setCommunityLevel] = useState<number | ''>('');
  const [communityCount, setCommunityCount] = useState<number>(20);

  const [practiceWords, setPracticeWords] = useState<Word[]>([]);
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [answerResult, setAnswerResult] = useState<boolean | null>(null);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [done, setDone] = useState(false);
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const syncSavedIds = async (baseWords?: Word[]) => {
    if (!token) {
      setAddedIds(new Set());
      return;
    }
    try {
      const mine = await getMyVocab(token, 500);
      const mineIds = new Set(mine.map(w => w._id));
      const scope = baseWords || communityWords;
      const scopedIds = new Set(scope.map(w => w._id));
      const merged = new Set<string>();
      for (const id of mineIds) {
        if (scopedIds.has(id)) merged.add(id);
      }
      setAddedIds(merged);
    } catch {
      setAddedIds(new Set());
    }
  };

  const loadCommunity = async (opts?: { topic?: string; level?: number | ''; count?: number }) => {
    setLoading(true);
    setError('');
    try {
      const effectiveTopic = opts?.topic ?? communityTopic;
      const effectiveLevel = typeof (opts?.level ?? communityLevel) === 'number' ? Number(opts?.level ?? communityLevel) : undefined;
      const effectiveCount = opts?.count ?? communityCount;

      const words = await getCommunityWords({
        count: effectiveCount,
        topic: effectiveTopic || undefined,
        level: effectiveLevel,
      });
      setCommunityWords(words);
      await syncSavedIds(words);
    } catch (e: any) {
      setError(e?.message || 'Không tải được dữ liệu cộng đồng');
      setCommunityWords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCommunity({ count: 20 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void syncSavedIds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const startCommunityPractice = () => {
    if (!communityWords.length) return;
    const shuffled = [...communityWords].sort(() => Math.random() - 0.5).slice(0, 10);
    setPracticeWords(shuffled);
    setIdx(0);
    setShowAnswer(false);
    setAnswerResult(null);
    setCorrect(0);
    setIncorrect(0);
    setDone(false);
  };

  const saveFromCommunity = async (w: Word) => {
    if (!token) {
      setInfo('Bạn cần đăng nhập để lưu từ từ cộng đồng.');
      return;
    }
    try {
      await addToMyVocab(w._id, token, w.sourceEntryId);
      setAddedIds(prev => new Set([...prev, w._id]));
      setInfo(`Đã lưu "${w.englishWord || w.vietnameseWord}" vào vốn từ của bạn.`);
    } catch (e: any) {
      const msg = String(e?.message || 'Không lưu được từ');
      if (/already|exist|đã có/i.test(msg)) {
        setAddedIds(prev => new Set([...prev, w._id]));
        setInfo(`Từ "${w.englishWord || w.vietnameseWord}" đã có trong vốn từ của bạn.`);
      } else {
        setInfo(msg);
      }
    }
    await syncSavedIds();
  };

  const downloadMyListFromCommunity = async () => {
    if (!token) {
      setInfo('Bạn cần đăng nhập để tải list vốn từ của mình.');
      return;
    }
    try {
      const mine = await getMyVocab(token, 500);
      const payload = {
        exportedAt: new Date().toISOString(),
        total: mine.length,
        words: mine,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-vocab-from-community-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setInfo(`Đã tải list vốn từ của bạn (${mine.length} từ).`);
    } catch (e: any) {
      setInfo(e?.message || 'Không tải được list vốn từ của bạn.');
    }
  };

  const current = practiceWords[idx];

  return (
    <div>
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontFamily: 'Playfair Display', fontSize: '1.2rem' }}>Cộng đồng</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { void downloadMyListFromCommunity(); }} disabled={!token}>Tải list của tôi</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { void loadCommunity(); }} disabled={loading}>Làm mới list</button>
            <button className="btn btn-ink btn-sm" onClick={startCommunityPractice} disabled={loading || communityWords.length === 0}>Bắt đầu ôn cộng đồng</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginTop: '0.8rem' }}>
          <select className="form-select" value={communityTopic} onChange={e => setCommunityTopic(e.target.value)}>
            <option value="">Tất cả chủ đề</option>
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <select className="form-select" value={communityLevel === '' ? '' : String(communityLevel)} onChange={e => setCommunityLevel(e.target.value ? Number(e.target.value) : '')}>
            <option value="">Tất cả cấp độ</option>
            {LEVELS.map(l => <option key={l} value={l}>Cấp {l}</option>)}
          </select>
          <select className="form-select" value={communityCount} onChange={e => setCommunityCount(Number(e.target.value))}>
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n} từ</option>)}
          </select>
        </div>

        <div style={{ marginTop: '0.6rem' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => { void loadCommunity({ topic: communityTopic, level: communityLevel, count: communityCount }); }}
            disabled={loading}
          >
            Áp dụng lọc
          </button>
        </div>

        {error && <div className="alert alert-error" style={{ marginTop: '0.8rem' }}>{error}</div>}
        {info && <div className="alert alert-success" style={{ marginTop: '0.8rem' }}>{info}</div>}

        <p style={{ marginTop: '0.8rem', color: '#666' }}>
          Đây là khu vực công khai: mọi người đều có thể thấy từ public và lưu về vốn từ của mình để học/test.
        </p>
      </div>

      {practiceWords.length > 0 && current && !done && (
        <div style={{ marginBottom: '1rem' }}>
          <FlashCard
            word={current}
            index={idx}
            total={practiceWords.length}
            showAnswer={showAnswer}
            answerResult={answerResult}
            onSubmitAnswer={(answer) => {
              const normalize = (s: string) =>
                (s || '')
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .toLowerCase()
                  .trim()
                  .replace(/\s+/g, ' ');
              const expected = current.vietnameseWord || '';
              const isCorrect = normalize(answer) === normalize(expected);
              setShowAnswer(true);
              setAnswerResult(isCorrect);
              if (isCorrect) setCorrect(c => c + 1);
              else setIncorrect(c => c + 1);
            }}
            onNext={() => {
              if (idx + 1 >= practiceWords.length) setDone(true);
              else {
                setIdx(i => i + 1);
                setShowAnswer(false);
                setAnswerResult(null);
              }
            }}
            isLast={idx + 1 >= practiceWords.length}
            mode="en-to-vi"
          />
        </div>
      )}

      {done && practiceWords.length > 0 && (
        <ResultScreen
          correct={correct}
          total={practiceWords.length}
          onRestart={startCommunityPractice}
          onNewSession={() => {
            setPracticeWords([]);
            setDone(false);
          }}
        />
      )}

      <div className="card">
        <h4 style={{ marginTop: 0 }}>Danh sách từ công khai ({communityWords.length})</h4>
        {loading ? (
          <p>Đang tải list cộng đồng...</p>
        ) : communityWords.length === 0 ? (
          <p>Chưa có từ public nào.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.6rem' }}>
            {communityWords.map(w => (
              <div key={w._id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.7rem', display: 'flex', justifyContent: 'space-between', gap: '0.7rem' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{w.englishWord || '(trống)'} {w.vietnameseWord ? `- ${w.vietnameseWord}` : ''}</div>
                  <div style={{ color: '#666', fontSize: '0.86rem' }}>{w.partOfSpeech || 'N/A'} | Cấp {w.level}</div>
                  {w.sharedBy?.username && (
                    <div style={{ color: '#888', fontSize: '0.82rem' }}>Chia sẻ bởi: {w.sharedBy.username}</div>
                  )}
                </div>
                <button className="btn btn-amber btn-sm" onClick={() => { void saveFromCommunity(w); }} disabled={addedIds.has(w._id)}>
                  {addedIds.has(w._id) ? 'Đã lưu' : 'Lưu về vốn từ'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [activeTab, setActiveTab] = useState<'review' | 'add' | 'community'>('review');
  // const [apiLogs, setApiLogs] = useState<ApiLogEntry[]>([]);

  const handleLogin = (t: string, u: string) => {
    const safeToken = normalizeAuthToken(t);
    setToken(safeToken); setUsername(u);
    localStorage.setItem('token', safeToken);
    localStorage.setItem('username', u);
    setShowAuth(false);
  };

  const handleLogout = () => {
    setToken(null);
    setUsername(null);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
  };

  useEffect(() => {
    const savedToken = normalizeAuthToken(localStorage.getItem('token'));
    const savedUsername = localStorage.getItem('username');
    if (!savedToken) return;

    getMe(savedToken)
      .then((res: any) => {
        const resolvedUsername = res?.user?.username || res?.username || savedUsername || null;
        setToken(savedToken);
        setUsername(resolvedUsername);
        if (resolvedUsername) {
          localStorage.setItem('username', resolvedUsername);
        }
      })
      .catch(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        setToken(null);
        setUsername(null);
      });
  }, []);

  // useEffect(() => {
  //   if (typeof window === 'undefined') return;

  //   setApiLogs(getApiLogHistory());
  //   const eventName = getApiLogEventName();
  //   const handler = (event: Event) => {
  //     const detail = (event as CustomEvent<ApiLogEntry>).detail;
  //     if (!detail) return;
  //     setApiLogs(prev => {
  //       const next = [...prev, detail];
  //       return next.length > 150 ? next.slice(next.length - 150) : next;
  //     });
  //   };

  //   window.addEventListener(eventName, handler as EventListener);
  //   return () => window.removeEventListener(eventName, handler as EventListener);
  // }, []);

  return (
    <>
      <Head>
        <title>VocabMaster — Học từ vựng tiếng Anh</title>
      </Head>

      <div className="app-shell">
        {/* Navbar */}
        <nav className="navbar">
          <a className="navbar-brand" href="#">Vocab<span>Master</span></a>
          <div className="navbar-right">
            {username ? (
              <>
                <span className="badge-user">👤 {username}</span>
                <button className="btn btn-ghost btn-sm" style={{ color: 'white', borderColor: 'rgba(255,255,255,0.3)' }} onClick={handleLogout}>Đăng xuất</button>
              </>
            ) : (
              <button className="btn btn-amber btn-sm" onClick={() => setShowAuth(true)}>Đăng nhập</button>
            )}
          </div>
        </nav>

        {/* Content */}
        <main className="main">
          {/* Hero */}
          <div className="hero">
            <h1 className="hero-title">Học từ vựng<br /><span>thông minh hơn</span></h1>
            <p className="hero-sub">
              {token ? `Xin chào, ${username}! Hệ thống sẽ tự điều chỉnh độ khó theo tiến trình của bạn.`
                : 'Bạn có thể ôn luyện ngay. Đăng nhập để lưu vốn từ cá nhân và theo dõi tiến trình.'}
            </p>
            {!token && (
              <button className="btn btn-ink btn-lg" onClick={() => setShowAuth(true)}>
                Đăng nhập để học cá nhân →
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="tabs">
            <button className={`tab ${activeTab === 'review' ? 'active' : ''}`} onClick={() => setActiveTab('review')}>📚 Ôn luyện</button>
            {token && <button className={`tab ${activeTab === 'add' ? 'active' : ''}`} onClick={() => setActiveTab('add')}>✏️ Thêm từ mới</button>}
            <button className={`tab ${activeTab === 'community' ? 'active' : ''}`} onClick={() => setActiveTab('community')}>🌐 Cộng đồng</button>
          </div>

          {token && activeTab === 'add' && <AddWordPanel token={token} />}
          {activeTab === 'review' && <ReviewPanel token={token} />}
          {activeTab === 'community' && <CommunityPanel token={token} />}

          {/* <details style={{ marginTop: '1.5rem' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>API Calls ({apiLogs.length})</summary>
            <div className="card" style={{ marginTop: '0.75rem', padding: '0.75rem', maxHeight: '280px', overflow: 'auto' }}>
              {apiLogs.length === 0 ? (
                <p style={{ margin: 0, color: '#666' }}>Chưa có API call nào trong phiên này.</p>
              ) : (
                apiLogs.slice().reverse().map((log, idx) => {
                  const method = String((log.meta?.method as string) || '-');
                  const url = String((log.meta?.url as string) || '-');
                  const status = log.meta?.status as number | undefined;
                  return (
                    <div key={`${log.timestamp}-${idx}`} style={{ padding: '0.45rem 0', borderBottom: '1px solid #eee', fontSize: '0.86rem' }}>
                      <strong>[{log.stage}]</strong> {log.apiName} | {method} | {url}{typeof status === 'number' ? ` | ${status}` : ''}
                    </div>
                  );
                })
              )}
            </div>
          </details> */}
        </main>
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleLogin} />}
    </>
  );
}
