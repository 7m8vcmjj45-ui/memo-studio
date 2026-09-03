'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Menu,
  Plus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

type Note = {
  id: string;
  title: string;
  body: string;
};

type MemoPage = {
  id: string;
  name: string;
  image: string;
  params: [number, number, number];
  notes: Note[];
  selectedNoteId: string;
};

type AppState = {
  activePageId: string;
  pages: MemoPage[];
  settings: {
    paramNames: [string, string, string];
  };
};

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=86';

const STORAGE_KEY = 'memo-studio-state-v1';

const createId = () => crypto.randomUUID();

const initialState: AppState = {
  activePageId: 'page-1',
  settings: { paramNames: ['ひらめき', '優先度', '進み具合'] },
  pages: [
    {
      id: 'page-1',
      name: 'アイデアノート',
      image: DEFAULT_IMAGE,
      params: [4, 2, 3],
      selectedNoteId: 'note-1',
      notes: [
        {
          id: 'note-1',
          title: '最初のメモ',
          body: '思いついたことを、ここに自由に書き残せます。\n\nタイトルや本文は入力と同時に保存されます。',
        },
        {
          id: 'note-2',
          title: '次に試したいこと',
          body: 'ページごとに画像、パラメータ、メモをまとめておけます。',
        },
      ],
    },
    {
      id: 'page-2',
      name: 'ストック',
      image: DEFAULT_IMAGE,
      params: [2, 5, 1],
      selectedNoteId: 'note-3',
      notes: [
        {
          id: 'note-3',
          title: 'あとで読む',
          body: '気になったことを一時的に置いておくページです。',
        },
      ],
    },
  ],
};

function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<AppState>;
  return (
    typeof candidate.activePageId === 'string' &&
    Array.isArray(candidate.pages) &&
    candidate.pages.length > 0 &&
    !!candidate.settings &&
    Array.isArray(candidate.settings.paramNames)
  );
}

export default function Home() {
  const [data, setData] = useState<AppState>(initialState);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<'loading' | 'saving' | 'saved' | 'offline'>(
    'loading',
  );

  const activePage = useMemo(
    () => data.pages.find((page) => page.id === data.activePageId) ?? data.pages[0],
    [data],
  );
  const activePageIndex = data.pages.findIndex((page) => page.id === activePage.id);
  const selectedNote =
    activePage.notes.find((note) => note.id === activePage.selectedNoteId) ??
    activePage.notes[0];

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (isAppState(parsed)) setData(parsed);
      }
      setSaveState('saved');
    } catch {
      setSaveState('offline');
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setSaveState('saving');
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setSaveState('saved');
      } catch {
        setSaveState('offline');
      }
    }, 550);
    return () => window.clearTimeout(timeout);
  }, [data, hydrated]);

  function updateActivePage(updater: (page: MemoPage) => MemoPage) {
    setData((current) => ({
      ...current,
      pages: current.pages.map((page) =>
        page.id === current.activePageId ? updater(page) : page,
      ),
    }));
  }

  function movePage(direction: -1 | 1) {
    const nextIndex =
      (activePageIndex + direction + data.pages.length) % data.pages.length;
    setData((current) => ({ ...current, activePageId: current.pages[nextIndex].id }));
  }

  function addPage() {
    const noteId = createId();
    const pageId = createId();
    const pageNumber = data.pages.length + 1;
    const page: MemoPage = {
      id: pageId,
      name: `新しいページ ${pageNumber}`,
      image: DEFAULT_IMAGE,
      params: [0, 0, 0],
      selectedNoteId: noteId,
      notes: [{ id: noteId, title: '新しいメモ', body: '' }],
    };
    setData((current) => ({
      ...current,
      activePageId: pageId,
      pages: [...current.pages, page],
    }));
    setMenuOpen(false);
  }

  function addNote() {
    const note: Note = { id: createId(), title: '新しいメモ', body: '' };
    updateActivePage((page) => ({
      ...page,
      notes: [...page.notes, note],
      selectedNoteId: note.id,
    }));
  }

  function updateSelectedNote(patch: Partial<Note>) {
    updateActivePage((page) => ({
      ...page,
      notes: page.notes.map((note) =>
        note.id === page.selectedNoteId ? { ...note, ...patch } : note,
      ),
    }));
  }

  function changeParam(index: number, direction: -1 | 1) {
    updateActivePage((page) => {
      const params = [...page.params] as [number, number, number];
      params[index] = Math.max(0, Math.min(5, params[index] + direction));
      return { ...page, params };
    });
  }

  return (
    <main className="app-viewport">
      <section className="memo-shell" aria-label="メモアプリ">
        <header className="app-header">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="header-button"
                  aria-label="メニューを開く"
                />
              }
            >
              <Menu aria-hidden="true" />
            </SheetTrigger>

            <SheetContent
              side="left"
              showCloseButton={false}
              className="menu-sheet"
            >
              <SheetHeader className="menu-heading">
                <SheetTitle className="menu-title">MENU</SheetTitle>
                <SheetDescription className="sr-only">
                  ページの切り替えとパラメータ名の設定
                </SheetDescription>
              </SheetHeader>

              <nav className="page-menu" aria-label="ページ一覧">
                <p className="menu-section-label">ページ</p>
                {data.pages.map((page, index) => (
                  <button
                    key={page.id}
                    type="button"
                    className="page-menu-item"
                    data-active={page.id === activePage.id}
                    onClick={() => {
                      setData((current) => ({ ...current, activePageId: page.id }));
                      setMenuOpen(false);
                    }}
                  >
                    <span>{page.name || `ページ ${index + 1}`}</span>
                    {page.id === activePage.id && <Check aria-hidden="true" />}
                  </button>
                ))}
                <button type="button" className="add-page-button" onClick={addPage}>
                  <Plus aria-hidden="true" />
                  ページを追加
                </button>
              </nav>

              <div className="settings-panel">
                <p className="menu-section-label accent-label">SETTINGS</p>
                {data.settings.paramNames.map((name, index) => (
                  <label key={index} className="setting-field">
                    <span>P{index + 1}名</span>
                    <Input
                      value={name}
                      maxLength={16}
                      onChange={(event) => {
                        const value = event.target.value;
                        setData((current) => {
                          const names = [...current.settings.paramNames] as [
                            string,
                            string,
                            string,
                          ];
                          names[index] = value;
                          return {
                            ...current,
                            settings: { paramNames: names },
                          };
                        });
                      }}
                    />
                  </label>
                ))}
              </div>

              <div className="menu-footer">
                <p>変更内容は自動で保存されます</p>
                <SheetClose
                  render={
                    <Button variant="ghost" className="close-menu-button" />
                  }
                >
                  閉じる
                </SheetClose>
              </div>
            </SheetContent>
          </Sheet>

          <div className="page-navigation">
            <Button
              variant="ghost"
              size="icon-lg"
              className="page-arrow"
              onClick={() => movePage(-1)}
              aria-label="前のページ"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <div className="page-title-wrap">
              <Input
                aria-label="ページ名"
                className="page-title-input"
                value={activePage.name}
                maxLength={32}
                onChange={(event) =>
                  updateActivePage((page) => ({ ...page, name: event.target.value }))
                }
              />
              <span className="page-counter">
                {activePageIndex + 1} / {data.pages.length}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-lg"
              className="page-arrow"
              onClick={() => movePage(1)}
              aria-label="次のページ"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>

          <div className="save-indicator" data-state={saveState} aria-live="polite">
            <span />
            {saveState === 'loading'
              ? '読込中'
              : saveState === 'saving'
                ? '保存中'
                : saveState === 'offline'
                  ? '保存できません'
                  : '保存済み'}
          </div>
        </header>

        <div className="workspace-grid">
          <figure className="image-panel">
            <img src={activePage.image} alt="ページのイメージ" />
            <figcaption>
              <ImageIcon aria-hidden="true" />
              PAGE IMAGE
            </figcaption>
          </figure>

          <section className="parameter-panel" aria-label="パラメータ">
            <div className="meter-list">
              {activePage.params.map((value, index) => (
                <div key={index} className="meter-group">
                  <p>{data.settings.paramNames[index] || `P${index + 1}`}</p>
                  <div className="meter-control">
                    <button
                      type="button"
                      onClick={() => changeParam(index, -1)}
                      aria-label={`${data.settings.paramNames[index]}を下げる`}
                    >
                      <ChevronLeft aria-hidden="true" />
                    </button>
                    <div
                      className="meter-bars"
                      role="meter"
                      aria-label={data.settings.paramNames[index]}
                      aria-valuemin={0}
                      aria-valuemax={5}
                      aria-valuenow={value}
                    >
                      {[1, 2, 3, 4, 5].map((step) => (
                        <span key={step} data-active={step <= value} />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => changeParam(index, 1)}
                      aria-label={`${data.settings.paramNames[index]}を上げる`}
                    >
                      <ChevronRight aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="note-list-panel" aria-label="メモ一覧">
            <div className="note-list-scroll">
              {activePage.notes.map((note) => (
                <button
                  type="button"
                  key={note.id}
                  className="note-list-item"
                  data-active={note.id === activePage.selectedNoteId}
                  onClick={() =>
                    updateActivePage((page) => ({
                      ...page,
                      selectedNoteId: note.id,
                    }))
                  }
                >
                  <strong>{note.title || '無題のメモ'}</strong>
                  <span>{note.body || '本文なし'}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              className="add-note-button"
              onClick={addNote}
              aria-label="メモを追加"
            >
              <Plus aria-hidden="true" />
            </button>
          </aside>

          <section className="note-editor" aria-label="選択中のメモ">
            {selectedNote ? (
              <>
                <Input
                  aria-label="メモのタイトル"
                  className="note-title-input"
                  value={selectedNote.title}
                  maxLength={80}
                  placeholder="メモのタイトル"
                  onChange={(event) => updateSelectedNote({ title: event.target.value })}
                />
                <Textarea
                  aria-label="メモの本文"
                  className="note-body-input"
                  value={selectedNote.body}
                  placeholder="ここにメモを書きます…"
                  onChange={(event) => updateSelectedNote({ body: event.target.value })}
                />
              </>
            ) : (
              <button type="button" className="empty-note" onClick={addNote}>
                <Plus aria-hidden="true" />
                最初のメモを追加
              </button>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}
