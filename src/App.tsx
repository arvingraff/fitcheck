import { useState, useMemo } from 'react';
import type { ClothingItem, Category } from './data/catalog';
import { catalog, categories, categoryLabels, categoryIcons } from './data/catalog';
import { scrapeProduct } from './scraper';
import MannequinViewer from './MannequinViewer';
import './App.css';

type Outfit = Partial<Record<Category, ClothingItem>>;

function AddFromWebModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (item: ClothingItem) => void;
}) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{
    title: string;
    image: string;
    price: number | null;
    siteName: string;
  } | null>(null);
  const [category, setCategory] = useState<Category>('shoes');

  const handleFetch = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setPreview(null);
    try {
      const data = await scrapeProduct(url.trim());
      if (!data.image && !data.title) {
        setError("Couldn't find product info on that page. Try a direct product URL.");
        return;
      }
      setPreview({
        title: data.title || 'Unknown Product',
        image: data.image || '',
        price: data.price,
        siteName: data.siteName || new URL(url).hostname.replace('www.', ''),
      });
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to fetch page');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    if (!preview) return;
    const item: ClothingItem = {
      id: `web-${Date.now()}`,
      name: preview.title,
      brand: preview.siteName,
      store: preview.siteName,
      storeColor: '#a78bfa',
      price: preview.price ?? 0,
      category,
      color: '',
      emoji: categoryIcons[category],
      tags: ['web import'],
      imageUrl: preview.image,
      sourceUrl: url,
    };
    onAdd(item);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-web" onClick={(e) => e.stopPropagation()}>
        <div className="modal-web-header">
          <h3>🌐 Add Item from the Web</h3>
          <p className="modal-web-sub">Paste a product URL from any clothing website</p>
        </div>

        <div className="web-url-row">
          <input
            className="search-input"
            type="url"
            placeholder="https://www.nike.com/t/air-max-270..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleFetch()}
            autoFocus
          />
          <button className="btn btn-primary" onClick={handleFetch} disabled={loading || !url.trim()}>
            {loading ? '⏳' : 'Fetch'}
          </button>
        </div>

        {error && <div className="web-error">⚠️ {error}</div>}

        {preview && (
          <div className="web-preview">
            <div className="web-preview-img-wrap">
              {preview.image ? (
                <img src={preview.image} alt={preview.title} className="web-preview-img" />
              ) : (
                <div className="web-preview-no-img">{categoryIcons[category]}</div>
              )}
            </div>
            <div className="web-preview-info">
              <div className="web-preview-store">{preview.siteName}</div>
              <div className="web-preview-name">{preview.title}</div>
              {preview.price != null && (
                <div className="web-preview-price">${preview.price}</div>
              )}
              <div className="web-category-row">
                <label className="sidebar-title" style={{ marginBottom: 6 }}>Category</label>
                <div className="web-category-grid">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      className={`web-cat-btn${category === cat ? ' active' : ''}`}
                      onClick={() => setCategory(cat)}
                    >
                      {categoryIcons[cat]} {categoryLabels[cat]}
                    </button>
                  ))}
                </div>
              </div>
              <button className="btn btn-primary btn-full" onClick={handleAdd}>
                ✅ Add to Outfit Builder
              </button>
            </div>
          </div>
        )}

        {!preview && !loading && (
          <div className="web-examples">
            <p className="web-examples-title">Works with any store, for example:</p>
            <div className="web-examples-list">
              {[
                'nike.com', 'adidas.com', 'zara.com', 'hm.com',
                'asos.com', 'uniqlo.com', 'gap.com', 'nordstrom.com',
                'ssense.com', 'farfetch.com',
              ].map((s) => (
                <span key={s} className="web-example-chip">{s}</span>
              ))}
            </div>
          </div>
        )}

        <button className="modal-close" onClick={onClose}>✕</button>
      </div>
    </div>
  );
}

export default function App() {
  const [activeCategory, setActiveCategory] = useState<Category>('shoes');
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [outfit, setOutfit] = useState<Outfit>({});
  const [search, setSearch] = useState('');
  const [savedOutfits, setSavedOutfits] = useState<{ name: string; outfit: Outfit }[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [outfitName, setOutfitName] = useState('');
  const [viewingSaved, setViewingSaved] = useState(false);
  const [webModalOpen, setWebModalOpen] = useState(false);
  const [extraItems, setExtraItems] = useState<ClothingItem[]>([]);
  const [activeView, setActiveView] = useState<'catalog' | 'board'>('catalog');
  const [hasMountedBoard, setHasMountedBoard] = useState(false);

  const allItems = useMemo(() => [...catalog, ...extraItems], [extraItems]);
  const allStores = useMemo(() => [...new Set(allItems.map((i) => i.store))].sort(), [allItems]);

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      const matchesCategory = item.category === activeCategory;
      const matchesStore = selectedStores.length === 0 || selectedStores.includes(item.store);
      const matchesSearch =
        search.trim() === '' ||
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.brand.toLowerCase().includes(search.toLowerCase()) ||
        item.color.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesStore && matchesSearch;
    });
  }, [allItems, activeCategory, selectedStores, search]);

  const selectItem = (item: ClothingItem) => {
    setOutfit((prev) => {
      if (prev[item.category]?.id === item.id) {
        const next = { ...prev };
        delete next[item.category];
        return next;
      }
      return { ...prev, [item.category]: item };
    });
  };

  const removeFromOutfit = (cat: Category) => {
    setOutfit((prev) => { const next = { ...prev }; delete next[cat]; return next; });
  };

  const outfitItems = categories.map((c) => outfit[c]).filter(Boolean) as ClothingItem[];
  const outfitStores = [...new Set(outfitItems.map((i) => i.store))];
  const totalPrice = outfitItems.reduce((s, i) => s + i.price, 0);

  const saveOutfit = () => {
    if (!outfitName.trim() || outfitItems.length === 0) return;
    setSavedOutfits((prev) => [...prev, { name: outfitName.trim(), outfit }]);
    setOutfitName('');
    setSaveModalOpen(false);
  };

  const handleWebAdd = (item: ClothingItem) => {
    setExtraItems((prev) => [...prev, item]);
    setOutfit((prev) => ({ ...prev, [item.category]: item }));
    setActiveCategory(item.category);
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">✨</span>
            <span className="logo-text">FitCheck</span>
          </div>
          <p className="header-sub">Mix &amp; match from any store on the web</p>
          <div className="header-actions">
            <button className="btn btn-accent" onClick={() => setWebModalOpen(true)}>
              🌐 Add from Web
            </button>
            {savedOutfits.length > 0 && (
              <button className="btn btn-ghost" onClick={() => setViewingSaved(!viewingSaved)}>
                👗 Saved ({savedOutfits.length})
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="main-layout">
        {/* Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-section">
            <h3 className="sidebar-title">Search</h3>
            <input
              className="search-input"
              type="text"
              placeholder="Search items..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">Category</h3>
            <div className="category-list">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`cat-btn${activeCategory === cat ? ' active' : ''}`}
                  onClick={() => { setActiveCategory(cat); setActiveView('catalog'); }}
                >
                  <span>{categoryIcons[cat]}</span>
                  <span>{categoryLabels[cat]}</span>
                  {outfit[cat] && <span className="cat-badge">✓</span>}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-title">Stores</h3>
            <div className="store-list">
              {allStores.map((store) => (
                <label key={store} className="store-label">
                  <input
                    type="checkbox"
                    checked={selectedStores.includes(store)}
                    onChange={() =>
                      setSelectedStores((prev) =>
                        prev.includes(store) ? prev.filter((s) => s !== store) : [...prev, store]
                      )
                    }
                  />
                  <span>{store}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Center — Catalog or Board */}
        <main className="catalog">
          <div className="catalog-header">
            <div className="view-tabs">
              <button
                className={`view-tab${activeView === 'catalog' ? ' active' : ''}`}
                onClick={() => setActiveView('catalog')}
              >
                🛍️ Catalog
              </button>
              <button
                className={`view-tab${activeView === 'board' ? ' active' : ''}`}
                onClick={() => { setActiveView('board'); setHasMountedBoard(true); }}
              >
                👗 Outfit Preview
              </button>
            </div>
            {activeView === 'catalog' && (
              <span className="catalog-count">{filteredItems.length} items</span>
            )}
          </div>

          <div style={{display: activeView === 'board' ? 'flex' : 'none', flex: 1, flexDirection: 'column', minHeight: 0}}>
            {hasMountedBoard && <MannequinViewer outfit={outfit} />}
          </div>

          {activeView !== 'board' && (filteredItems.length === 0 ? (
            <div className="empty-state">No items found. Try adjusting filters or add from the web!</div>
          ) : (
            <div className="items-grid">
              {filteredItems.map((item) => {
                const isSelected = outfit[item.category]?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`item-card${isSelected ? ' selected' : ''}`}
                    onClick={() => selectItem(item)}
                  >
                    {isSelected && <div className="item-check">✓</div>}
                    {item.sourceUrl ? (
                      <a
                        href={item.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="item-store-link"
                        onClick={(e) => e.stopPropagation()}
                        title={`View on ${item.store}`}
                      >
                        🔗
                      </a>
                    ) : null}
                    <div className="item-img-wrap">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="item-img"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            `https://placehold.co/200x200/1a1a2e/a78bfa?text=${encodeURIComponent(item.emoji)}`;
                        }}
                      />
                    </div>
                    <div className="item-info">
                      <div className="item-name">{item.name}</div>
                      <div className="item-color">{item.color}</div>
                      <div className="item-footer">
                        <span className="item-store" style={{ borderColor: item.storeColor, color: item.storeColor }}>
                          {item.store}
                        </span>
                        <span className="item-price">${item.price}</span>
                      </div>
                      <div className="item-tags">
                        {item.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </main>

        {/* Right panel — Outfit Builder */}
        <aside className="outfit-panel">
          <div className="outfit-header">
            <h2 className="outfit-title">Your Outfit</h2>
            {outfitItems.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => setOutfit({})}>Clear</button>
            )}
          </div>

          {outfitItems.length === 0 ? (
            <div className="outfit-empty">
              <div className="outfit-empty-icon">🛍️</div>
              <p>Click items to build your outfit,<br />or add anything from the web!</p>
              <button className="btn btn-accent btn-sm" onClick={() => setWebModalOpen(true)}>
                🌐 Add from Web
              </button>
            </div>
          ) : (
            <>
              {/* Mini outfit preview */}
              <div className="outfit-mini-board" onClick={() => setActiveView('board')}>
                {outfitItems.map((item) => (
                  <img
                    key={item.id}
                    src={item.imageUrl}
                    alt={item.name}
                    className="outfit-mini-img"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        `https://placehold.co/80x80/1a1a2e/a78bfa?text=${encodeURIComponent(item.emoji)}`;
                    }}
                  />
                ))}
                <div className="outfit-mini-hint">Click to see full preview →</div>
              </div>

              <div className="outfit-items">
                {categories.map((cat) => {
                  const item = outfit[cat];
                  if (!item) return null;
                  return (
                    <div key={cat} className="outfit-item">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="outfit-item-img"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            `https://placehold.co/48x48/1a1a2e/a78bfa?text=${encodeURIComponent(item.emoji)}`;
                        }}
                      />
                      <div className="outfit-item-info">
                        <div className="outfit-item-name">{item.name}</div>
                        <div className="outfit-item-meta">
                          <span className="outfit-item-store" style={{ color: item.storeColor }}>{item.store}</span>
                          <span className="outfit-item-price">${item.price}</span>
                        </div>
                      </div>
                      <button className="outfit-item-remove" onClick={() => removeFromOutfit(cat)}>×</button>
                    </div>
                  );
                })}
              </div>

              <div className="outfit-total">
                <span>Total</span>
                <span className="outfit-total-price">${totalPrice}</span>
              </div>

              <div className="outfit-stores">
                <div className="outfit-stores-label">
                  From {outfitStores.length} store{outfitStores.length > 1 ? 's' : ''}:
                </div>
                <div className="outfit-store-badges">
                  {outfitStores.map((store) => (
                    <span
                      key={store}
                      className="outfit-store-badge"
                      style={{ borderColor: outfitItems.find((i) => i.store === store)!.storeColor }}
                    >
                      {store}
                    </span>
                  ))}
                </div>
              </div>

              <button className="btn btn-primary btn-full" onClick={() => setSaveModalOpen(true)}>
                💾 Save Outfit
              </button>
            </>
          )}
        </aside>
      </div>

      {/* Saved Outfits Drawer */}
      {viewingSaved && savedOutfits.length > 0 && (
        <div className="saved-drawer">
          <div className="saved-drawer-header">
            <h3>My Saved Outfits</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setViewingSaved(false)}>✕</button>
          </div>
          <div className="saved-list">
            {savedOutfits.map((saved, i) => (
              <div key={i} className="saved-card">
                <div className="saved-card-imgs">
                  {categories.map((cat) => saved.outfit[cat] && (
                    <img
                      key={cat}
                      src={saved.outfit[cat]!.imageUrl}
                      alt={saved.outfit[cat]!.name}
                      className="saved-card-img"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          `https://placehold.co/40x40/1a1a2e/a78bfa?text=${encodeURIComponent(saved.outfit[cat]!.emoji)}`;
                      }}
                    />
                  ))}
                </div>
                <div className="saved-card-info">
                  <div className="saved-card-name">{saved.name}</div>
                  <div className="saved-card-price">
                    ${Object.values(saved.outfit).reduce((s, i) => s + (i?.price ?? 0), 0)}
                  </div>
                  <div className="saved-card-stores">
                    {[...new Set(Object.values(saved.outfit).filter(Boolean).map((i) => i!.store))].join(', ')}
                  </div>
                </div>
                <div className="saved-card-actions">
                  <button className="btn btn-primary btn-sm" onClick={() => { setOutfit(saved.outfit); setViewingSaved(false); }}>Load</button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setSavedOutfits((prev) => prev.filter((_, j) => j !== i))}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add from Web Modal */}
      {webModalOpen && (
        <AddFromWebModal onClose={() => setWebModalOpen(false)} onAdd={handleWebAdd} />
      )}

      {/* Save Outfit Modal */}
      {saveModalOpen && (
        <div className="modal-overlay" onClick={() => setSaveModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Save this outfit</h3>
            <input
              className="search-input"
              type="text"
              placeholder="Give your outfit a name..."
              value={outfitName}
              onChange={(e) => setOutfitName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveOutfit()}
              autoFocus
            />
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setSaveModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveOutfit} disabled={!outfitName.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
