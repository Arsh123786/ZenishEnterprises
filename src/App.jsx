import { useEffect, useState } from 'react'
import zenishLogo from '../Zenish Logo.jpg'
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import './App.css'
import {
  BUYER_ACCOUNT_KEY,
  DEFAULT_BUYER_ACCOUNT,
  SELLER_EMAIL,
  SELLER_PASSWORD,
  STORAGE_KEY,
  buildProductForm,
  formatCurrency,
  getProductDiscount,
  getStoredBuyerCart,
  loadAppState,
  loadBuyerAccounts,
  loadBuyerSession,
  makeId,
  persistBuyerCart,
  saveAppState,
  saveBuyerAccounts,
  saveBuyerSession,
} from './store.js'

const defaultTheme = () => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const compressImageToDataUrl = (file, maxWidth = 1200, quality = 0.72) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const scale = Math.min(1, maxWidth / Math.max(img.width, img.height))
        canvas.width = Math.max(1, Math.round(img.width * scale))
        canvas.height = Math.max(1, Math.round(img.height * scale))

        const context = canvas.getContext('2d')
        context.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = () => reject(new Error('Image could not be processed'))
      img.src = String(reader.result)
    }
    reader.onerror = () => reject(new Error('Image file could not be read'))
    reader.readAsDataURL(file)
  })

function App() {
  const [appState, setAppState] = useState(() => loadAppState())
  const [theme, setTheme] = useState(() => {
    const savedTheme = typeof window !== 'undefined' ? window.localStorage.getItem('zenish-theme') : null
    return savedTheme || defaultTheme()
  })
  const [cartOpen, setCartOpen] = useState(false)
  const [redirectTo, setRedirectTo] = useState('')

  useEffect(() => {
    saveAppState(appState)
    if (appState.buyerSession?.email) {
      persistBuyerCart(appState.cart, appState.buyerSession.email)
    } else {
      persistBuyerCart(appState.cart, '')
    }
  }, [appState])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('zenish-theme', theme)
    }
  }, [theme])

  useEffect(() => {
    const handleStorageSync = (event) => {
      if (event.key !== STORAGE_KEY) return

      try {
        const nextState = event.newValue ? JSON.parse(event.newValue) : null
        if (nextState) {
          setAppState((prev) => ({
            ...prev,
            ...loadAppState(),
          }))
        }
      } catch {
        // Ignore malformed payloads from another tab.
      }
    }

    window.addEventListener('storage', handleStorageSync)
    return () => window.removeEventListener('storage', handleStorageSync)
  }, [])

  const syncBuyerCartFromStorage = (email) => {
    if (!email) {
      const guestCart = getStoredBuyerCart('')
      setAppState((prev) => ({ ...prev, cart: guestCart }))
      return
    }

    const signedCart = getStoredBuyerCart(email)
    setAppState((prev) => ({
      ...prev,
      cart: signedCart.length ? signedCart : prev.cart,
    }))
  }

  const loginBuyer = (email, password) => {
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const normalizedPassword = String(password || '').trim()
    const accounts = loadBuyerAccounts()
    const account = accounts.find(
      (item) => item.email.toLowerCase() === normalizedEmail && item.password === normalizedPassword,
    )

    if (!account) return false

    const nextSession = {
      isLoggedIn: true,
      name: account.name,
      email: account.email,
    }

    setAppState((prev) => {
      const currentCart = prev.cart || []
      const storedCart = getStoredBuyerCart(account.email)
      const mergedCart = storedCart.length ? storedCart : currentCart

      return {
        ...prev,
        buyerSession: nextSession,
        cart: mergedCart,
      }
    })
    saveBuyerSession(nextSession)
    persistBuyerCart(getStoredBuyerCart(account.email) || [], account.email)
    return true
  }

  const registerBuyer = ({ name, email, password }) => {
    const trimmedName = String(name || '').trim()
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const trimmedPassword = String(password || '').trim()
    if (!trimmedName || !normalizedEmail || !trimmedPassword) return false

    const accounts = loadBuyerAccounts()
    const exists = accounts.some((account) => account.email.toLowerCase() === normalizedEmail)
    if (exists) return false

    const nextAccount = {
      id: makeId('buyer'),
      name: trimmedName,
      email: normalizedEmail,
      password: trimmedPassword,
    }

    const nextAccounts = [nextAccount, ...accounts]
    saveBuyerAccounts(nextAccounts)

    const nextSession = { isLoggedIn: true, name: trimmedName, email: normalizedEmail }
    setAppState((prev) => ({
      ...prev,
      buyerSession: nextSession,
      cart: prev.cart || [],
    }))
    saveBuyerSession(nextSession)
    return true
  }

  const logoutBuyer = () => {
    const activeCart = appState.cart || []
    if (appState.buyerSession?.email) {
      persistBuyerCart(activeCart, appState.buyerSession.email)
    }
    setAppState((prev) => ({ ...prev, buyerSession: { isLoggedIn: false, name: '', email: '' }, cart: activeCart }))
    saveBuyerSession({ isLoggedIn: false, name: '', email: '' })
  }

  const loginSeller = (email, password) => {
    if (email === SELLER_EMAIL && password === SELLER_PASSWORD) {
      setAppState((prev) => ({
        ...prev,
        sellerSession: { isLoggedIn: true },
      }))
      return true
    }

    return false
  }

  const logoutSeller = () => {
    setAppState((prev) => ({
      ...prev,
      sellerSession: { isLoggedIn: false },
    }))
  }

  const addOrUpdateProduct = (product) => {
    setAppState((prev) => {
      const existingIndex = prev.products.findIndex((item) => item.id === product.id)
      const nextProducts = [...prev.products]

      if (existingIndex >= 0) {
        nextProducts[existingIndex] = product
      } else {
        nextProducts.unshift(product)
      }

      return { ...prev, products: nextProducts }
    })
  }

  const deleteProduct = (productId) => {
    setAppState((prev) => ({
      ...prev,
      products: prev.products.filter((product) => product.id !== productId),
    }))
  }

  const saveCategory = (category) => {
    setAppState((prev) => {
      const exists = prev.categories.some((item) => item.id === category.id)
      return {
        ...prev,
        categories: exists
          ? prev.categories.map((item) => (item.id === category.id ? category : item))
          : [category, ...prev.categories],
      }
    })
  }

  const deleteCategory = (categoryId) => {
    setAppState((prev) => ({
      ...prev,
      categories: prev.categories.filter((category) => category.id !== categoryId),
    }))
  }

  const saveSettings = (settings) => {
    setAppState((prev) => ({ ...prev, settings }))
  }

  const addMessage = (message) => {
    setAppState((prev) => ({ ...prev, messages: [message, ...prev.messages] }))
  }

  const addToCart = (product, quantity = 1) => {
    setAppState((prev) => {
      const item = prev.cart.find((entry) => entry.productId === product.id)
      const nextCart = item
        ? prev.cart.map((entry) =>
            entry.productId === product.id ? { ...entry, quantity: entry.quantity + quantity } : entry,
          )
        : [
            ...prev.cart,
            {
              id: makeId('cart'),
              productId: product.id,
              name: product.name,
              price: Number(product.price || 0),
              image: product.primaryImage || product.images?.[0] || '',
              quantity,
            },
          ]

      if (prev.buyerSession?.email) {
        persistBuyerCart(nextCart, prev.buyerSession.email)
      } else {
        persistBuyerCart(nextCart, '')
      }

      return { ...prev, cart: nextCart }
    })
    setCartOpen(true)
  }

  const updateCartItem = (productId, quantity) => {
    setAppState((prev) => {
      const nextCart = prev.cart
        .map((item) => (item.productId === productId ? { ...item, quantity: Math.max(0, quantity) } : item))
        .filter((item) => item.quantity > 0)

      if (prev.buyerSession?.email) {
        persistBuyerCart(nextCart, prev.buyerSession.email)
      } else {
        persistBuyerCart(nextCart, '')
      }

      return { ...prev, cart: nextCart }
    })
  }

  const removeFromCart = (productId) => {
    setAppState((prev) => {
      const nextCart = prev.cart.filter((item) => item.productId !== productId)

      if (prev.buyerSession?.email) {
        persistBuyerCart(nextCart, prev.buyerSession.email)
      } else {
        persistBuyerCart(nextCart, '')
      }

      return { ...prev, cart: nextCart }
    })
  }

  const clearCart = () => {
    setAppState((prev) => {
      const nextCart = []
      if (prev.buyerSession?.email) {
        persistBuyerCart(nextCart, prev.buyerSession.email)
      } else {
        persistBuyerCart(nextCart, '')
      }

      return { ...prev, cart: nextCart }
    })
  }

  const updateAnalytics = (group, key, delta = 1) => {
    setAppState((prev) => {
      const current = prev.analytics?.[group] || {}
      return {
        ...prev,
        analytics: {
          ...(prev.analytics || {}),
          [group]: {
            ...current,
            [key]: (current[key] || 0) + delta,
          },
        },
      }
    })
  }

  const currentProductCount = appState.products.filter((product) => product.status === 'active').length
  const currentCategoryCount = appState.categories.filter((category) => category.active).length
  const totalReviews = appState.reviews.filter((review) => review.visible !== false).length
  const cartCount = appState.cart.reduce((sum, item) => sum + item.quantity, 0)
  const cartTotal = appState.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <BrowserRouter basename="/ZenishEnterprises">
      <Routes>
        <Route
          path="/"
          element={
            <BuyerLayout
              appState={appState}
              theme={theme}
              setTheme={setTheme}
              currentProductCount={currentProductCount}
              currentCategoryCount={currentCategoryCount}
              totalReviews={totalReviews}
              cartCount={cartCount}
              cartTotal={cartTotal}
              cartOpen={cartOpen}
              setCartOpen={setCartOpen}
              onAddToCart={addToCart}
              onUpdateCartItem={updateCartItem}
              onRemoveFromCart={removeFromCart}
              buyerSession={appState.buyerSession}
              onLogoutBuyer={logoutBuyer}
              onLoginBuyer={loginBuyer}
              onRegisterBuyer={registerBuyer}
            />
          }
        >
          <Route index element={<HomePage appState={appState} onAddToCart={addToCart} />} />
          <Route path="shop" element={<ShopPage appState={appState} onAddToCart={addToCart} />} />
          <Route path="categories" element={<CategoriesPage appState={appState} />} />
          <Route path="search" element={<SearchPage appState={appState} onAddToCart={addToCart} />} />
          <Route path="videos" element={<VideosPage appState={appState} />} />
          <Route path="offers" element={<OffersPage appState={appState} />} />
          <Route path="about" element={<AboutPage appState={appState} />} />
          <Route path="contact" element={<ContactPage appState={appState} addMessage={addMessage} />} />
          <Route path="login" element={<LoginPage buyerSession={appState.buyerSession} onLoginBuyer={loginBuyer} onRegisterBuyer={registerBuyer} onLogoutBuyer={logoutBuyer} />} />
          <Route path="cart" element={<CartPage appState={appState} onUpdateCartItem={updateCartItem} onRemoveFromCart={removeFromCart} onClearCart={clearCart} />} />
          <Route
            path="product/:productId"
            element={<ProductPage appState={appState} updateAnalytics={updateAnalytics} addMessage={addMessage} onAddToCart={addToCart} />}
          />
        </Route>

        <Route path="/seller/login" element={<SellerLoginPage onLogin={loginSeller} />} />

        <Route
          path="/seller"
          element={
            appState.sellerSession?.isLoggedIn ? (
              <SellerLayout appState={appState} onLogout={logoutSeller} setAppState={setAppState} />
            ) : (
              <Navigate to="/seller/login" replace />
            )
          }
        >
          <Route index element={<SellerDashboardPage appState={appState} />} />
          <Route path="dashboard" element={<SellerDashboardPage appState={appState} />} />
          <Route
            path="products"
            element={<SellerProductsPage appState={appState} onDelete={deleteProduct} onUpdate={addOrUpdateProduct} />}
          />
          <Route
            path="products/new"
            element={<ProductEditorPage appState={appState} onSave={addOrUpdateProduct} mode="new" />}
          />
          <Route
            path="products/:productId/edit"
            element={<ProductEditorPage appState={appState} onSave={addOrUpdateProduct} mode="edit" />}
          />
          <Route
            path="categories"
            element={<SellerCategoriesPage appState={appState} onSave={saveCategory} onDelete={deleteCategory} />}
          />
          <Route path="media" element={<SellerMediaPage appState={appState} />} />
          <Route path="reviews" element={<SellerReviewsPage appState={appState} setAppState={setAppState} />} />
          <Route path="messages" element={<SellerMessagesPage appState={appState} setAppState={setAppState} />} />
          <Route path="analytics" element={<AnalyticsPage appState={appState} />} />
          <Route path="settings" element={<SellerSettingsPage appState={appState} onSave={saveSettings} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function BuyerLayout({
  appState,
  theme,
  setTheme,
  currentProductCount,
  currentCategoryCount,
  totalReviews,
  cartCount,
  cartTotal,
  cartOpen,
  setCartOpen,
  onAddToCart,
  onUpdateCartItem,
  onRemoveFromCart,
  buyerSession,
  onLogoutBuyer,
}) {
  return (
    <div className="shell">
      <Header
        theme={theme}
        setTheme={setTheme}
        cartCount={cartCount}
        setCartOpen={setCartOpen}
        buyerSession={buyerSession}
        onLogoutBuyer={onLogoutBuyer}
      />
      <main className="page-shell">
        <Outlet context={{ appState, onAddToCart }} />
      </main>
      <Footer
        currentProductCount={currentProductCount}
        currentCategoryCount={currentCategoryCount}
        totalReviews={totalReviews}
      />
      <CartDrawer
        isOpen={cartOpen}
        items={appState.cart}
        subtotal={cartTotal}
        onClose={() => setCartOpen(false)}
        onUpdateQuantity={onUpdateCartItem}
        onRemove={onRemoveFromCart}
      />
    </div>
  )
}

function Header({ theme, setTheme, cartCount, setCartOpen, buyerSession, onLogoutBuyer }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')

  const handleSearch = (event) => {
    event.preventDefault()
    const term = query.trim()
    if (!term) return
    navigate(`/search?q=${encodeURIComponent(term)}`)
  }

  return (
    <header className="topbar">
      <div className="container nav-row">
        <Link to="/" className="brand" aria-label="Zenish Enterprises home">
          <img src={zenishLogo} alt="Zenish Enterprises" className="brand-logo" />
        </Link>

        <nav className="main-nav" aria-label="Main navigation">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/shop">Shop</NavLink>
          <NavLink to="/categories">Categories</NavLink>
          <NavLink to="/videos">Videos</NavLink>
          <NavLink to="/offers">Offers</NavLink>
          <NavLink to="/about">About</NavLink>
          <NavLink to="/contact">Contact</NavLink>
        </nav>

        <div className="nav-actions">
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search products"
              aria-label="Search products"
            />
            <button type="submit">Search</button>
          </form>

          {buyerSession?.isLoggedIn ? (
            <>
              <span className="user-pill">Hi, {buyerSession.name || 'Buyer'}</span>
              <button type="button" className="ghost-button small" onClick={onLogoutBuyer}>Logout</button>
            </>
          ) : (
            <Link to="/login" className="ghost-button small">Account</Link>
          )}

          <button
            type="button"
            className="ghost-button small"
            onClick={() => setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'))}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
          <Link to="/cart" className="cart-pill" aria-label="Open shopping cart">
            Cart <span>{cartCount}</span>
          </Link>
        </div>
      </div>
    </header>
  )
}

function Footer({ currentProductCount, currentCategoryCount, totalReviews }) {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <div className="brand brand-footer">
            <img src={zenishLogo} alt="Zenish Enterprises" className="brand-logo brand-logo-footer" />
          </div>
          <p>
            Premium essentials, thoughtfully selected for modern living.
          </p>
        </div>

        <div>
          <h3>Explore</h3>
          <ul>
            <li><Link to="/about">About</Link></li>
            <li><Link to="/shop">Shop</Link></li>
            <li><Link to="/categories">Categories</Link></li>
            <li><Link to="/contact">Contact</Link></li>
          </ul>
        </div>

        <div>
          <h3>Marketplace</h3>
          <ul>
            <li><a href="https://www.amazon.in" target="_blank" rel="noreferrer">Amazon</a></li>
            <li><a href="https://www.flipkart.com" target="_blank" rel="noreferrer">Flipkart</a></li>
            <li><a href="https://instagram.com" target="_blank" rel="noreferrer">Instagram</a></li>
            <li><a href="https://facebook.com" target="_blank" rel="noreferrer">Facebook</a></li>
          </ul>
        </div>

        <div>
          <h3>Legal</h3>
          <ul>
            <li><Link to="/about">Privacy</Link></li>
            <li><Link to="/about">Terms</Link></li>
            <li><Link to="/contact">Support</Link></li>
          </ul>
        </div>
      </div>

      <div className="container footer-meta">
        <span>© 2026 Zenish Enterprises</span>
        <span>{currentProductCount} active products</span>
        <span>{currentCategoryCount} categories</span>
        <span>{totalReviews} reviews</span>
      </div>
    </footer>
  )
}

function HomePage({ appState, onAddToCart }) {
  const activeProducts = appState.products.filter((product) => product.status === 'active')
  const featuredProducts = activeProducts.filter((product) => product.featured)
  const newProducts = activeProducts.filter((product) => product.newArrival)
  const bestSellers = activeProducts.filter((product) => product.bestseller)
  const offerProducts = activeProducts.filter((product) => product.offer)
  const videoProducts = activeProducts.filter((product) => product.video)

  return (
    <>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Premium essentials for modern living</span>
            <h1>{appState.settings.heroTitle}</h1>
            <p>{appState.settings.heroSubtitle}</p>
            <div className="hero-actions">
              <Link to="/shop" className="primary-button">Explore Collection</Link>
              <Link to="/categories" className="secondary-button">Browse Categories</Link>
            </div>
            <div className="hero-metrics">
              <div>
                <strong>{activeProducts.length}</strong>
                <span>Active products</span>
              </div>
              <div>
                <strong>{appState.categories.filter((cat) => cat.active).length}</strong>
                <span>Categories</span>
              </div>
              <div>
                <strong>{appState.reviews.filter((review) => review.visible !== false).length}</strong>
                <span>Reviews</span>
              </div>
            </div>
          </div>
          <div className="hero-visual">
            <img src={appState.settings.heroImage} alt="Zenish premium lifestyle products" />
          </div>
        </div>
      </section>

      <div className="announcement-bar container">
        <span>{appState.settings.announcementText}</span>
      </div>

      <section className="section container">
        <SectionHeader title={appState.settings.featuredTitle} subtitle="Curated picks for refined homes and gifting" />
        <ProductRow products={featuredProducts.slice(0, 4)} appState={appState} onAddToCart={onAddToCart} />
      </section>

      <section className="section container">
        <SectionHeader title="New Arrivals" subtitle="Fresh additions for elevated everyday living" />
        <ProductRow products={newProducts.slice(0, 4)} appState={appState} onAddToCart={onAddToCart} />
      </section>

      <section className="section container">
        <SectionHeader title="Best Sellers" subtitle="Most loved picks across our collection" />
        <ProductRow products={bestSellers.slice(0, 4)} appState={appState} onAddToCart={onAddToCart} />
      </section>

      <section className="section container">
        <SectionHeader title="Special Offers" subtitle="Premium value without compromising on quality" />
        <ProductRow products={offerProducts.slice(0, 4)} appState={appState} onAddToCart={onAddToCart} />
      </section>

      <section className="section container">
        <SectionHeader title="Shop by Category" subtitle="Find the right fit for your home and routine" />
        <div className="category-grid">
          {appState.categories.filter((category) => category.active).map((category) => {
            const categoryProductCount = activeProducts.filter((product) => product.categoryId === category.id).length
            return (
              <Link to={`/shop?category=${encodeURIComponent(category.id)}`} key={category.id} className="category-card">
                <div className="category-visual" />
                <h3>{category.name}</h3>
                <p>{category.description}</p>
                <span>{categoryProductCount} products</span>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="section container">
        <SectionHeader title="Zenish Videos" subtitle="Discover products in motion" />
        <div className="video-grid">
          {videoProducts.slice(0, 3).map((product) => (
            <div key={product.id} className="video-card">
              <video src={product.video} controls preload="metadata" poster={product.primaryImage} />
              <div className="video-card-body">
                <h3>{product.name}</h3>
                <p>{product.shortDescription}</p>
                <div className="row-between">
                  <span>{formatCurrency(product.price)}</span>
                  <Link to={`/product/${product.id}`} className="secondary-button small">View Product</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section container">
        <SectionHeader title="Customer Reviews" subtitle="Authentic feedback from our community" />
        <div className="review-grid">
          {appState.reviews.filter((review) => review.visible !== false).slice(0, 3).map((review) => (
            <article key={review.id} className="review-card">
              <div className="rating">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
              <p>“{review.review}”</p>
              <strong>{review.customer}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="section container brand-story">
        <div>
          <span className="eyebrow">Our story</span>
          <h2>About Zenish</h2>
          <p>{appState.settings.brandDescription}</p>
          <Link to="/about" className="primary-button">Learn more</Link>
        </div>
        <div className="story-panel">
          <div className="story-pills">
            <span>Curated</span>
            <span>Premium</span>
            <span>Modern</span>
          </div>
        </div>
      </section>

      <section className="section container">
        <SectionHeader title="Marketplace Trust" subtitle="Products are also available through established marketplaces" />
        <div className="trust-row">
          <div>Amazon</div>
          <div>Flipkart</div>
          <div>Trusted Bazaar</div>
          <div>Curated Home Essentials</div>
        </div>
      </section>
    </>
  )
}

function ShopPage({ appState, onAddToCart }) {
  const [searchParams] = useSearchParams()
  const filterCategory = searchParams.get('category') || 'all'

  const visibleProducts = appState.products.filter(
    (product) => product.status === 'active' && (filterCategory === 'all' || product.categoryId === filterCategory),
  )

  return (
    <div className="container page-header-block">
      <SectionHeader title="Shop" subtitle="Discover quality-led products curated for everyday living" />
      <div className="product-grid">
        {visibleProducts.length ? (
          visibleProducts.map((product) => <ProductCard key={product.id} product={product} appState={appState} onAddToCart={onAddToCart} />)
        ) : (
          <EmptyState title="No products found" description="New products will appear here as soon as the seller adds them to the catalogue." />
        )}
      </div>
    </div>
  )
}

function CategoriesPage({ appState }) {
  const visibleCategories = appState.categories.filter((category) => category.active)
  return (
    <div className="container page-header-block">
      <SectionHeader title="Categories" subtitle="Browse curated product categories" />
      <div className="category-grid">
        {visibleCategories.length ? (
          visibleCategories.map((category) => (
            <Link to={`/shop?category=${encodeURIComponent(category.id)}`} key={category.id} className="category-card large">
              <div className="category-visual" />
              <h3>{category.name}</h3>
              <p>{category.description}</p>
              <span>Explore collection</span>
            </Link>
          ))
        ) : (
          <EmptyState title="No categories yet" description="Add your first category from the seller dashboard to organise the store." />
        )}
      </div>
    </div>
  )
}

function SearchPage({ appState, onAddToCart }) {
  const [searchParams] = useSearchParams()
  const query = (searchParams.get('q') || '').trim().toLowerCase()
  const results = appState.products.filter(
    (product) =>
      product.status === 'active' &&
      (!query ||
        product.name.toLowerCase().includes(query) ||
        product.shortDescription.toLowerCase().includes(query) ||
        product.description.toLowerCase().includes(query) ||
        product.keywords?.toLowerCase().includes(query)),
  )

  return (
    <div className="container page-header-block">
      <SectionHeader title="Search" subtitle={query ? `Search results for “${query}”` : 'Search all active products'} />
      <div className="product-grid">
        {results.length ? (
          results.map((product) => <ProductCard key={product.id} product={product} appState={appState} onAddToCart={onAddToCart} />)
        ) : (
          <EmptyState title="No matching products" description="Try a different keyword or visit the full shop catalogue." />
        )}
      </div>
    </div>
  )
}

function ProductPage({ appState, updateAnalytics, addMessage, onAddToCart }) {
  const { productId } = useParams()
  const product = appState.products.find((item) => item.id === productId)
  const [selectedImage, setSelectedImage] = useState('')
  const [showBuyModal, setShowBuyModal] = useState(false)
  const [cartNotice, setCartNotice] = useState('')

  useEffect(() => {
    if (!product) return
    setSelectedImage(product.primaryImage || product.images?.[0])
    updateAnalytics('productViews', product.id, 1)
  }, [product, productId, updateAnalytics])

  if (!product) {
    return (
      <div className="container page-header-block">
        <EmptyState title="Product not found" description="This item may have been removed or is no longer available." />
      </div>
    )
  }

  const productReviews = appState.reviews.filter((review) => review.productId === product.id && review.visible !== false)
  const averageRating = productReviews.length
    ? productReviews.reduce((sum, review) => sum + review.rating, 0) / productReviews.length
    : 4.6
  const discount = getProductDiscount(product)

  const handleBuyNow = () => setShowBuyModal(true)

  const handleMarketplaceClick = (channel) => {
    updateAnalytics('marketplaceClicks', `${product.id}-${channel}`, 1)
    const url = channel === 'amazon' ? product.amazonUrl : product.flipkartUrl
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleAddToCart = () => {
    onAddToCart(product)
    setCartNotice('Added to cart. You can still complete purchase via Amazon or Flipkart from the product page.')
  }

  return (
    <div className="container product-page">
      <div className="product-gallery">
        <div className="product-thumbnail-list">
          {product.images?.map((image) => (
            <button key={image} type="button" onClick={() => setSelectedImage(image)} className={selectedImage === image ? 'active' : ''}>
              <img src={image} alt={product.name} />
            </button>
          ))}
        </div>
        <div className="main-product-image">
          <img src={selectedImage || product.primaryImage} alt={product.name} />
          {product.video && (
            <div className="product-video-box">
              <video src={product.video} controls preload="metadata" poster={product.primaryImage} />
            </div>
          )}
        </div>
      </div>

      <div className="product-info">
        <span className="eyebrow">{appState.categories.find((category) => category.id === product.categoryId)?.name || 'Featured product'}</span>
        <h1>{product.name}</h1>
        <div className="rating-line">
          <span className="stars">{'★'.repeat(Math.round(averageRating))}{'☆'.repeat(5 - Math.round(averageRating))}</span>
          <span>{averageRating.toFixed(1)} rating</span>
          <span>{productReviews.length} reviews</span>
        </div>
        <div className="price-row">
          <strong>{formatCurrency(product.price)}</strong>
          <span className="mrp">{formatCurrency(product.mrp)}</span>
          <span className="discount-tag">{discount}% off</span>
        </div>
        <p className="product-short-description">{product.shortDescription}</p>
        <div className="action-row">
          <button type="button" className="primary-button" onClick={handleBuyNow}>Buy Now</button>
          <button type="button" className="secondary-button" onClick={handleAddToCart}>Add to Cart</button>
        </div>
        {cartNotice && <p className="cart-note">{cartNotice}</p>}

        <div className="stock-row">
          <span className={product.stock > 0 ? 'in-stock' : 'out-of-stock'}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </span>
          <span>SKU: {product.sku}</span>
        </div>

        <div className="spec-box">
          <h3>Product details</h3>
          <p>{product.description}</p>
        </div>
      </div>

      <div className="product-content-grid">
        <div className="section-card">
          <h3>Specifications</h3>
          <ul className="spec-list">
            <li><strong>Material:</strong> {product.material || 'Not specified'}</li>
            <li><strong>Dimensions:</strong> {product.dimensions || 'Not specified'}</li>
            <li><strong>Weight:</strong> {product.weight || 'Not specified'}</li>
            <li><strong>Custom specifications:</strong> {product.customSpecifications || 'Not specified'}</li>
          </ul>
        </div>

        <div className="section-card">
          <h3>Variations</h3>
          {product.variations?.length ? (
            <div className="variation-list">
              {product.variations.map((variation) => (
                <div key={variation.id} className="variation-item">
                  <strong>{variation.name}</strong>
                  <span>{variation.options.join(', ')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No variations added yet.</p>
          )}
        </div>
      </div>

      <div className="customer-question-box section-card">
        <h3>Ask About This Product</h3>
        <QuestionForm productId={product.id} onSubmitQuestion={addMessage} />
      </div>

      <div className="section-card reviews-card">
        <h3>Customer Reviews</h3>
        {productReviews.length ? (
          <div className="review-list">
            {productReviews.map((review) => (
              <div key={review.id} className="review-item">
                <div className="rating">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</div>
                <p>{review.review}</p>
                <strong>{review.customer}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p>No reviews yet. Demo reviews will appear when added by the seller.</p>
        )}
      </div>

      <div className="related-products">
        <SectionHeader title="You may also like" subtitle="More premium essentials from Zenish" />
        <ProductRow products={appState.products.filter((item) => item.id !== product.id && item.status === 'active').slice(0, 4)} appState={appState} />
      </div>

      {showBuyModal && (
        <div className="modal-backdrop" onClick={() => setShowBuyModal(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="close-modal" onClick={() => setShowBuyModal(false)}>×</button>
            <h3>Where would you like to buy?</h3>
            <div className="modal-list">
              <button type="button" className="modal-option" onClick={() => setShowBuyModal(false)}>
                <span>Buy from Zenish Enterprises</span>
                <small>Coming Soon</small>
              </button>
              {product.amazonUrl && (
                <button type="button" className="modal-option" onClick={() => { handleMarketplaceClick('amazon'); setShowBuyModal(false) }}>
                  <span>Buy from Amazon</span>
                  <small>Open marketplace link</small>
                </button>
              )}
              {product.flipkartUrl && (
                <button type="button" className="modal-option" onClick={() => { handleMarketplaceClick('flipkart'); setShowBuyModal(false) }}>
                  <span>Buy from Flipkart</span>
                  <small>Open marketplace link</small>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function QuestionForm({ productId, onSubmitQuestion }) {
  const [form, setForm] = useState({ name: '', email: '', question: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    const message = {
      id: makeId('message'),
      productId,
      name: form.name,
      email: form.email,
      question: form.question,
      status: 'new',
      createdAt: new Date().toISOString().slice(0, 10),
    }

    onSubmitQuestion(message)
    setSubmitted(true)
    setForm({ name: '', email: '', question: '' })
  }

  return (
    <form className="question-form" onSubmit={handleSubmit}>
      <div className="grid-two">
        <label>
          Name
          <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        </label>
        <label>
          Email
          <input value={form.email} type="email" onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        </label>
      </div>
      <label>
        Question
        <textarea value={form.question} onChange={(event) => setForm({ ...form, question: event.target.value })} required rows="4" />
      </label>
      <button type="submit" className="primary-button">Submit question</button>
      {submitted && <p className="success-message">Your question has been sent to the seller.</p>}
    </form>
  )
}

function VideosPage({ appState }) {
  const products = appState.products.filter((product) => product.status === 'active' && product.video)

  return (
    <div className="container page-header-block">
      <SectionHeader title="Zenish Videos" subtitle="Short-form product discovery for premium essentials" />
      <div className="video-feed">
        {products.length ? (
          products.map((product) => (
            <article key={product.id} className="video-feed-item">
              <video src={product.video} controls preload="metadata" poster={product.primaryImage} />
              <div className="video-feed-content">
                <div className="row-between">
                  <h3>{product.name}</h3>
                  <span>{formatCurrency(product.price)}</span>
                </div>
                <p>{product.shortDescription}</p>
                <div className="video-feed-actions">
                  <Link to={`/product/${product.id}`} className="secondary-button small">View Product</Link>
                  <Link to={`/product/${product.id}`} className="primary-button small">Buy Now</Link>
                </div>
              </div>
            </article>
          ))
        ) : (
          <EmptyState title="No product videos yet" description="The seller can upload videos from the dashboard to populate this discovery experience." />
        )}
      </div>
    </div>
  )
}

function OffersPage({ appState }) {
  const offers = appState.products.filter((product) => product.status === 'active' && product.offer)

  return (
    <div className="container page-header-block">
      <SectionHeader title="Offers" subtitle="Curated deals and premium value picks" />
      <div className="product-grid">
        {offers.length ? (
          offers.map((product) => <ProductCard key={product.id} product={product} appState={appState} />)
        ) : (
          <EmptyState title="No active offers" description="Seller-managed offers will appear here when they are set live." />
        )}
      </div>
    </div>
  )
}

function AboutPage({ appState }) {
  return (
    <div className="container page-header-block about-page">
      <SectionHeader title="About Zenish" subtitle="A premium resell brand built for modern, thoughtful living" />
      <div className="story-grid">
        <div className="story-card">
          <h3>Our mission</h3>
          <p>{appState.settings.brandDescription}</p>
        </div>
        <div className="story-card">
          <h3>What we offer</h3>
          <p>Home décor, utility pieces, kitchen essentials, and gifting products selected for quality, craftsmanship, and functional elegance.</p>
        </div>
      </div>

      <section className="section team-section">
        <SectionHeader title="Our Team" subtitle="Meet the people behind Zenish Enterprises" />
        <div className="team-grid">
          {appState.team?.map((member) => (
            <div key={member.id} className="team-card">
              <div className="team-avatar">{member.name.charAt(0)}</div>
              <h3>{member.name}</h3>
              <p className="team-position">{member.position}</p>
              <p className="team-age">Age: {member.age}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function ContactPage({ appState, addMessage }) {
  const [submitted, setSubmitted] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  const handleSubmit = (event) => {
    event.preventDefault()
    const nextMessage = {
      id: makeId('contact'),
      productId: 'general',
      name: form.name,
      email: form.email,
      question: form.message,
      status: 'new',
      createdAt: new Date().toISOString().slice(0, 10),
    }

    addMessage(nextMessage)
    setSubmitted(true)
    setForm({ name: '', email: '', message: '' })
  }

  return (
    <div className="container page-header-block contact-page">
      <SectionHeader title="Contact" subtitle="Speak with the Zenish team" />
      <div className="contact-grid">
        <div className="contact-card">
          <h3>Reach us</h3>
          <p>{appState.settings.contactName}</p>
          <p>{appState.settings.contactEmail}</p>
          <p>{appState.settings.contactPhone}</p>
          <p>{appState.settings.address}</p>
        </div>
        <form className="contact-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </label>
          <label>
            Message
            <textarea rows="5" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} required />
          </label>
          <button type="submit" className="primary-button">Send message</button>
          {submitted && <p className="success-message">Thank you. Your message has been sent to the seller.</p>}
        </form>
      </div>
    </div>
  )
}

function LoginPage({ buyerSession, onLoginBuyer, onRegisterBuyer, onLogoutBuyer }) {
  const navigate = useNavigate()
  const [isRegistering, setIsRegistering] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (isRegistering) {
      const ok = onRegisterBuyer(form)
      if (!ok) {
        setError('This buyer account already exists. Please log in instead.')
        return
      }

      setSuccess('Buyer account created successfully.')
      setForm({ name: '', email: '', password: '' })
      setTimeout(() => navigate('/'), 800)
      return
    }

    const ok = onLoginBuyer(form.email, form.password)
    if (!ok) {
      setError('Invalid buyer credentials. Use the demo buyer account or create a new one.')
      return
    }

    navigate('/')
  }

  const handleLogout = () => {
    onLogoutBuyer()
    setSuccess('Buyer logged out.')
  }

  if (buyerSession?.isLoggedIn) {
    return (
      <div className="container auth-page">
        <div className="auth-panel">
          <img src={zenishLogo} alt="Zenish Enterprises" className="auth-logo" />
          <span className="eyebrow">Buyer account</span>
          <h1>Welcome back</h1>
          <p className="user-summary">Signed in as {buyerSession.name || buyerSession.email}</p>
          <div className="auth-grid">
            <button type="button" className="primary-button" onClick={() => navigate('/')}>Continue shopping</button>
            <button type="button" className="secondary-button" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container auth-page">
      <div className="auth-panel">
        <img src={zenishLogo} alt="Zenish Enterprises" className="auth-logo" />
        <span className="eyebrow">Welcome to Zenish</span>
        <h1>{isRegistering ? 'Create buyer account' : 'Buyer login'}</h1>
        <form className="login-form" onSubmit={handleSubmit}>
          {isRegistering && (
            <label>
              Full name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your name" required />
            </label>
          )}
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" required />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Enter password" required />
          </label>
          {error && <p className="error-message">{error}</p>}
          {success && <p className="success-message">{success}</p>}
          <button type="submit" className="primary-button">{isRegistering ? 'Create account' : 'Login as buyer'}</button>
        </form>
        <div className="auth-grid">
          <button type="button" className="secondary-button" onClick={() => setIsRegistering((prev) => !prev)}>
            {isRegistering ? 'Already have an account?' : 'Create account'}
          </button>
          <button type="button" className="secondary-button" onClick={() => navigate('/seller/login')}>
            Login as Seller
          </button>
        </div>
        <p className="developer-note small-note">Demo buyer: buyer@zenish.com / Zenish@123</p>
      </div>
    </div>
  )
}

function SellerLayout({ appState, onLogout, setAppState }) {
  const location = useLocation()

  return (
    <div className="seller-shell">
      <aside className="seller-sidebar">
        <div className="seller-brand">
          <img src={zenishLogo} alt="Zenish Enterprises" className="brand-logo seller-brand-logo" />
        </div>

        <nav className="seller-nav">
          <NavLink to="/seller/dashboard">Dashboard</NavLink>
          <NavLink to="/seller/products">Products</NavLink>
          <NavLink to="/seller/products/new">Add Product</NavLink>
          <NavLink to="/seller/categories">Categories</NavLink>
          <NavLink to="/seller/media">Media</NavLink>
          <NavLink to="/seller/reviews">Reviews</NavLink>
          <NavLink to="/seller/messages">Messages</NavLink>
          <NavLink to="/seller/analytics">Analytics</NavLink>
          <NavLink to="/seller/settings">Settings</NavLink>
        </nav>

        <button type="button" className="secondary-button" onClick={onLogout}>Logout</button>
      </aside>

      <div className="seller-main">
        <div className="seller-header">
          <div>
            <span className="eyebrow">Seller Studio</span>
            <h2>{location.pathname.includes('dashboard') ? 'Dashboard' : 'Operations'}</h2>
          </div>
          <Link to="/" className="ghost-button">View buyer front</Link>
        </div>
        <Outlet context={{ appState, setAppState }} />
      </div>
    </div>
  )
}

function SellerLoginPage({ onLogin }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    const isValid = onLogin(email, password)
    if (isValid) {
      navigate('/seller/dashboard')
      return
    }

    setError('Invalid seller credentials. Please use the development seller login.')
  }

  return (
    <div className="container auth-page">
      <div className="auth-panel seller-login-panel">
        <img src={zenishLogo} alt="Zenish Enterprises" className="auth-logo" />
        <span className="eyebrow">Protected access</span>
        <h1>Seller Login</h1>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Enter seller email" required />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter seller password" required />
          </label>
          {error && <p className="error-message">{error}</p>}
          <button type="submit" className="primary-button">Enter dashboard</button>
        </form>
      </div>
    </div>
  )
}

function SellerDashboardPage({ appState }) {
  const activeProducts = appState.products.filter((product) => product.status === 'active')
  const categories = appState.categories.filter((category) => category.active)
  const reviews = appState.reviews.filter((review) => review.visible !== false)
  const messages = appState.messages.filter((message) => message.status === 'new')
  const totalProductViews = Object.values(appState.analytics?.productViews || {}).reduce((sum, value) => sum + Number(value || 0), 0)
  const recentActivity = [
    ...appState.products.slice(0, 4).map((product) => ({ type: 'Product', title: `${product.name} updated`, meta: product.status })),
    ...appState.messages.slice(0, 2).map((message) => ({ type: 'Message', title: `${message.name} asked a question`, meta: message.status })),
    ...appState.reviews.slice(0, 2).map((review) => ({ type: 'Review', title: `${review.customer} left a review`, meta: `${review.rating} stars` })),
  ].slice(0, 6)

  return (
    <div className="dashboard-grid">
      <MetricCard label="Products" value={activeProducts.length} caption="Active catalogue" />
      <MetricCard label="Categories" value={categories.length} caption="Live groups" />
      <MetricCard label="Product views" value={totalProductViews} caption="Tracked product views" />
      <MetricCard label="Reviews" value={reviews.length} caption="Visible reviews" />
      <MetricCard label="Messages" value={messages.length} caption="New customer questions" />

      <div className="dashboard-panel wide-panel">
        <h3>Recent activity</h3>
        <ul className="activity-list">
          {recentActivity.length ? (
            recentActivity.map((activity, index) => (
              <li key={`${activity.type}-${index}`}>
                <span className="activity-type">{activity.type}</span>
                <div>
                  <strong>{activity.title}</strong>
                  <small>{activity.meta}</small>
                </div>
              </li>
            ))
          ) : (
            <EmptyState title="No recent activity" description="Product updates, reviews, and messages will appear here." compact />
          )}
        </ul>
      </div>
    </div>
  )
}

function SellerProductsPage({ appState, onDelete, onUpdate }) {
  const navigate = useNavigate()

  const handleDuplicate = (product) => {
    const duplicated = {
      ...product,
      id: makeId('product'),
      name: `${product.name} Copy`,
      sku: `${product.sku || 'ZEN'}-COPY`,
      status: 'active',
      demo: false,
    }
    onUpdate(duplicated)
  }

  const toggleStatus = (product) => {
    const nextProduct = { ...product, status: product.status === 'active' ? 'inactive' : 'active' }
    onUpdate(nextProduct)
  }

  return (
    <div className="panel-box">
      <div className="panel-header">
        <h3>Product management</h3>
        <button type="button" className="primary-button" onClick={() => navigate('/seller/products/new')}>Add product</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Image</th>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Featured</th>
              <th>New</th>
              <th>Bestseller</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {appState.products.length ? (
              appState.products.map((product) => (
                <tr key={product.id}>
                  <td><img src={product.primaryImage || product.images?.[0]} alt={product.name} className="table-thumb" /></td>
                  <td>{product.name}</td>
                  <td>{appState.categories.find((category) => category.id === product.categoryId)?.name || 'Unassigned'}</td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>{product.status}</td>
                  <td>{product.featured ? 'Yes' : 'No'}</td>
                  <td>{product.newArrival ? 'Yes' : 'No'}</td>
                  <td>{product.bestseller ? 'Yes' : 'No'}</td>
                  <td className="table-actions">
                    <button type="button" className="link-button" onClick={() => navigate(`/seller/products/${product.id}/edit`)}>Edit</button>
                    <button type="button" className="link-button" onClick={() => handleDuplicate(product)}>Duplicate</button>
                    <button type="button" className="link-button" onClick={() => toggleStatus(product)}>{product.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                    <button type="button" className="link-button destructive" onClick={() => onDelete(product.id)}>Delete</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9">
                  <EmptyState title="No products found" description="Add your first product from the seller dashboard." compact />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProductEditorPage({ appState, onSave, mode }) {
  const { productId } = useParams()
  const navigate = useNavigate()
  const product = appState.products.find((item) => item.id === productId)
  const [form, setForm] = useState(() => ({
    ...buildProductForm(product?.categoryId || appState.categories[0]?.id || ''),
    ...(product || {}),
  }))

  useEffect(() => {
    if (product) {
      setForm({ ...buildProductForm(product.categoryId), ...product })
    }
  }, [product])

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleImageFiles = (event) => {
    const files = Array.from(event.target.files || [])
    if (!files.length) return

    Promise.all(
      files.map(async (file) => {
        try {
          return await compressImageToDataUrl(file)
        } catch {
          return ''
        }
      }),
    ).then((images) => {
      const filteredImages = images.filter(Boolean)
      if (!filteredImages.length) return

      setForm((prev) => {
        const merged = [...(prev.images || []), ...filteredImages]
        return {
          ...prev,
          images: merged,
          primaryImage: prev.primaryImage || merged[0],
        }
      })
    })
  }

  const handleVideoFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.size > 2 * 1024 * 1024) {
      window.alert('Video files are limited to 2 MB in this app so product data stays saved after refresh.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setForm((prev) => ({ ...prev, video: String(reader.result) }))
    }
    reader.readAsDataURL(file)
  }

  const updateVariation = (index, field, value) => {
    setForm((prev) => {
      const variations = [...prev.variations]
      variations[index] = { ...variations[index], [field]: value }
      return { ...prev, variations }
    })
  }

  const addVariationGroup = () => {
    setForm((prev) => ({
      ...prev,
      variations: [...(prev.variations || []), { id: makeId('variation'), name: 'Variation', options: ['Option 1'] }],
    }))
  }

  const removeVariation = (index) => {
    setForm((prev) => ({
      ...prev,
      variations: prev.variations.filter((_, itemIndex) => itemIndex !== index),
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    const normalized = {
      ...form,
      id: form.id || makeId('product'),
      price: Number(form.price || 0),
      mrp: Number(form.mrp || 0),
      stock: Number(form.stock || 0),
      status: form.status || 'active',
      primaryImage: form.primaryImage || form.images?.[0] || '',
      images: form.images?.length ? form.images : [form.primaryImage || ''],
      variations: form.variations || [],
      seoTitle: form.seoTitle || form.name,
      seoDescription: form.seoDescription || form.shortDescription,
      keywords: form.keywords || form.name,
      demo: Boolean(form.demo),
    }
    onSave(normalized)
    navigate('/seller/products')
  }

  return (
    <div className="panel-box">
      <div className="panel-header">
        <h3>{mode === 'edit' ? 'Edit Product' : 'Add Product'}</h3>
      </div>
      <form className="product-form" onSubmit={handleSubmit}>
        <div className="form-section">
          <h4>Basic information</h4>
          <div className="grid-two">
            <label>Product name<input value={form.name} onChange={(event) => updateField('name', event.target.value)} required /></label>
            <label>Category
              <select value={form.categoryId} onChange={(event) => updateField('categoryId', event.target.value)}>
                {appState.categories.filter((category) => category.active).map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
          </div>
          <label>Short description<textarea rows="2" value={form.shortDescription} onChange={(event) => updateField('shortDescription', event.target.value)} required /></label>
          <label>Full description<textarea rows="5" value={form.description} onChange={(event) => updateField('description', event.target.value)} required /></label>
        </div>

        <div className="form-section">
          <h4>Pricing</h4>
          <div className="grid-three">
            <label>Selling price<input type="number" value={form.price} onChange={(event) => updateField('price', event.target.value)} required /></label>
            <label>MRP<input type="number" value={form.mrp} onChange={(event) => updateField('mrp', event.target.value)} required /></label>
            <label>Discount<input type="number" value={getProductDiscount(form) || 0} readOnly /></label>
          </div>
        </div>

        <div className="form-section">
          <h4>Inventory</h4>
          <div className="grid-two">
            <label>Stock<input type="number" value={form.stock} onChange={(event) => updateField('stock', event.target.value)} /></label>
            <label>SKU<input value={form.sku} onChange={(event) => updateField('sku', event.target.value)} /></label>
          </div>
        </div>

        <div className="form-section">
          <h4>Product information</h4>
          <div className="grid-two">
            <label>Material<input value={form.material} onChange={(event) => updateField('material', event.target.value)} /></label>
            <label>Dimensions<input value={form.dimensions} onChange={(event) => updateField('dimensions', event.target.value)} /></label>
            <label>Weight<input value={form.weight} onChange={(event) => updateField('weight', event.target.value)} /></label>
            <label>Custom specifications<input value={form.customSpecifications} onChange={(event) => updateField('customSpecifications', event.target.value)} /></label>
          </div>
          <label>Specifications<textarea rows="3" value={form.specs} onChange={(event) => updateField('specs', event.target.value)} /></label>
        </div>

        <div className="form-section">
          <h4>Marketplace</h4>
          <div className="grid-two">
            <label>Amazon URL<input value={form.amazonUrl} onChange={(event) => updateField('amazonUrl', event.target.value)} /></label>
            <label>Flipkart URL<input value={form.flipkartUrl} onChange={(event) => updateField('flipkartUrl', event.target.value)} /></label>
          </div>
        </div>

        <div className="form-section">
          <h4>Classification</h4>
          <div className="checkbox-grid">
            <label><input type="checkbox" checked={Boolean(form.featured)} onChange={() => updateField('featured', !form.featured)} /> Featured</label>
            <label><input type="checkbox" checked={Boolean(form.newArrival)} onChange={() => updateField('newArrival', !form.newArrival)} /> New Arrival</label>
            <label><input type="checkbox" checked={Boolean(form.bestseller)} onChange={() => updateField('bestseller', !form.bestseller)} /> Best Seller</label>
            <label><input type="checkbox" checked={Boolean(form.offer)} onChange={() => updateField('offer', !form.offer)} /> Offer</label>
            <label><input type="checkbox" checked={form.status === 'active'} onChange={() => updateField('status', form.status === 'active' ? 'inactive' : 'active')} /> Active listing</label>
          </div>
        </div>

        <div className="form-section">
          <h4>Images</h4>
          <input type="file" accept="image/*" multiple onChange={handleImageFiles} />
          {form.images?.length ? (
            <div className="media-grid">
              {form.images.map((image) => (
                <div key={image} className="media-item">
                  <img src={image} alt="Product preview" />
                  <div className="media-actions">
                    <button type="button" className="link-button" onClick={() => updateField('primaryImage', image)}>Set primary</button>
                    <button type="button" className="link-button destructive" onClick={() => updateField('images', form.images.filter((item) => item !== image))}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="form-section">
          <h4>Video</h4>
          <input type="file" accept="video/*" onChange={handleVideoFile} />
          {form.video && (
            <div className="media-item video-item">
              <video src={form.video} controls preload="metadata" />
              <button type="button" className="link-button destructive" onClick={() => updateField('video', '')}>Remove video</button>
            </div>
          )}
        </div>

        <div className="form-section">
          <h4>Variations</h4>
          {form.variations?.map((variation, index) => (
            <div key={variation.id || index} className="variation-editor-box">
              <div className="grid-two">
                <input value={variation.name} onChange={(event) => updateVariation(index, 'name', event.target.value)} placeholder="Variation name" />
                <input value={variation.options.join(', ')} onChange={(event) => updateVariation(index, 'options', event.target.value.split(',').map((option) => option.trim()).filter(Boolean))} placeholder="Option 1, Option 2" />
              </div>
              <button type="button" className="link-button destructive" onClick={() => removeVariation(index)}>Remove variation</button>
            </div>
          ))}
          <button type="button" className="secondary-button" onClick={addVariationGroup}>Add variation</button>
        </div>

        <div className="form-section">
          <h4>SEO</h4>
          <div className="grid-two">
            <label>SEO title<input value={form.seoTitle} onChange={(event) => updateField('seoTitle', event.target.value)} /></label>
            <label>Search keywords<input value={form.keywords} onChange={(event) => updateField('keywords', event.target.value)} /></label>
          </div>
          <label>SEO description<textarea rows="3" value={form.seoDescription} onChange={(event) => updateField('seoDescription', event.target.value)} /></label>
        </div>

        <div className="form-actions">
          <button type="submit" className="primary-button">Save product</button>
          <button type="button" className="secondary-button" onClick={() => navigate('/seller/products')}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

function SellerCategoriesPage({ appState, onSave, onDelete }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!name.trim()) return

    const payload = {
      id: editingId || makeId('category'),
      name: name.trim(),
      description: description.trim() || 'Curated product category',
      active: true,
    }
    onSave(payload)
    setName('')
    setDescription('')
    setEditingId('')
  }

  const handleEdit = (category) => {
    setEditingId(category.id)
    setName(category.name)
    setDescription(category.description)
  }

  return (
    <div className="panel-grid">
      <div className="panel-box">
        <h3>Create category</h3>
        <form className="category-form" onSubmit={handleSubmit}>
          <label>
            Category name
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label>
            Description
            <textarea rows="4" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
          <button type="submit" className="primary-button">{editingId ? 'Update category' : 'Create category'}</button>
        </form>
      </div>

      <div className="panel-box">
        <h3>Active categories</h3>
        <div className="stack-list">
          {appState.categories.length ? (
            appState.categories.map((category) => (
              <div key={category.id} className="stack-item">
                <div>
                  <strong>{category.name}</strong>
                  <small>{category.description}</small>
                </div>
                <div className="inline-actions">
                  <button type="button" className="link-button" onClick={() => handleEdit(category)}>Edit</button>
                  <button type="button" className="link-button destructive" onClick={() => onDelete(category.id)}>Delete</button>
                </div>
              </div>
            ))
          ) : (
            <EmptyState title="No categories yet" description="Add your first category to power the buyer storefront." compact />
          )}
        </div>
      </div>
    </div>
  )
}

function SellerMediaPage({ appState }) {
  return (
    <div className="panel-box">
      <h3>Media library</h3>
      <div className="media-grid">
        {appState.products.length ? (
          appState.products.map((product) => (
            <div key={product.id} className="media-item large-media">
              <img src={product.primaryImage || product.images?.[0]} alt={product.name} />
              <div>
                <strong>{product.name}</strong>
                <p>{product.video ? 'Video attached' : 'No video'}</p>
                <small>{product.images?.length || 0} images</small>
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="No media yet" description="Images and videos will appear here once products are added." compact />
        )}
      </div>
    </div>
  )
}

function SellerReviewsPage({ appState, setAppState }) {
  const toggleReview = (reviewId) => {
    setAppState((prev) => ({
      ...prev,
      reviews: prev.reviews.map((review) =>
        review.id === reviewId ? { ...review, visible: review.visible === false ? true : false } : review,
      ),
    }))
  }

  return (
    <div className="panel-box">
      <h3>Reviews</h3>
      <div className="stack-list">
        {appState.reviews.length ? (
          appState.reviews.map((review) => (
            <div key={review.id} className="stack-item review-stack-item">
              <div>
                <strong>{review.customer}</strong>
                <p>{review.review}</p>
              </div>
              <div className="inline-actions">
                <span className="badge">{review.rating}★</span>
                <button type="button" className="link-button" onClick={() => toggleReview(review.id)}>{review.visible === false ? 'Show' : 'Hide'}</button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="No reviews yet" description="Demo and customer reviews will show here." compact />
        )}
      </div>
    </div>
  )
}

function SellerMessagesPage({ appState, setAppState }) {
  const handleStatus = (messageId) => {
    setAppState((prev) => ({
      ...prev,
      messages: prev.messages.map((message) =>
        message.id === messageId ? { ...message, status: 'handled' } : message,
      ),
    }))
  }

  return (
    <div className="panel-box">
      <h3>Messages</h3>
      <div className="stack-list">
        {appState.messages.length ? (
          appState.messages.map((message) => (
            <div key={message.id} className="stack-item message-item">
              <div>
                <strong>{message.name}</strong>
                <small>{message.email}</small>
                <p>{message.question}</p>
              </div>
              <div className="inline-actions">
                <span className="badge">{message.status}</span>
                <button type="button" className="link-button" onClick={() => handleStatus(message.id)}>Mark handled</button>
              </div>
            </div>
          ))
        ) : (
          <EmptyState title="No customer messages" description="Questions from buyers will appear here for response." compact />
        )}
      </div>
    </div>
  )
}

function AnalyticsPage({ appState }) {
  const totalProductViews = Object.values(appState.analytics?.productViews || {}).reduce((sum, value) => sum + Number(value || 0), 0)
  const totalMarketplaceClicks = Object.values(appState.analytics?.marketplaceClicks || {}).reduce((sum, value) => sum + Number(value || 0), 0)
  const totalVideoViews = Object.values(appState.analytics?.videoViews || {}).reduce((sum, value) => sum + Number(value || 0), 0)

  return (
    <div className="panel-box">
      <h3>Analytics</h3>
      {totalProductViews || totalMarketplaceClicks || totalVideoViews ? (
        <div className="analytics-grid">
          <MetricCard label="Product views" value={totalProductViews} caption="Tracked buyer views" />
          <MetricCard label="Marketplace clicks" value={totalMarketplaceClicks} caption="Amazon and Flipkart visits" />
          <MetricCard label="Video views" value={totalVideoViews} caption="Video discovery engagement" />
          <MetricCard label="Active products" value={appState.products.filter((product) => product.status === 'active').length} caption="Currently listed" />
        </div>
      ) : (
        <EmptyState title="No data yet" description="Buyer interactions and product engagement will appear here once the storefront is in use." compact />
      )}
    </div>
  )
}

function SellerSettingsPage({ appState, onSave }) {
  const [form, setForm] = useState(appState.settings)

  useEffect(() => {
    setForm(appState.settings)
  }, [appState.settings])

  const updateField = (name, value) => setForm((prev) => ({ ...prev, [name]: value }))

  const handleSubmit = (event) => {
    event.preventDefault()
    onSave(form)
  }

  return (
    <div className="panel-box">
      <h3>Website settings</h3>
      <form className="settings-form" onSubmit={handleSubmit}>
        <div className="grid-two">
          <label>Hero title<input value={form.heroTitle} onChange={(event) => updateField('heroTitle', event.target.value)} /></label>
          <label>Featured section title<input value={form.featuredTitle} onChange={(event) => updateField('featuredTitle', event.target.value)} /></label>
          <label>Hero subtitle<textarea rows="3" value={form.heroSubtitle} onChange={(event) => updateField('heroSubtitle', event.target.value)} /></label>
          <label>Announcement text<input value={form.announcementText} onChange={(event) => updateField('announcementText', event.target.value)} /></label>
          <label>Hero image URL<input value={form.heroImage} onChange={(event) => updateField('heroImage', event.target.value)} /></label>
          <label>Brand description<textarea rows="4" value={form.brandDescription} onChange={(event) => updateField('brandDescription', event.target.value)} /></label>
          <label>Contact email<input type="email" value={form.contactEmail} onChange={(event) => updateField('contactEmail', event.target.value)} /></label>
          <label>Phone<input value={form.contactPhone} onChange={(event) => updateField('contactPhone', event.target.value)} /></label>
          <label>Address<input value={form.address} onChange={(event) => updateField('address', event.target.value)} /></label>
          <label>Footer text<input value={form.footerText} onChange={(event) => updateField('footerText', event.target.value)} /></label>
        </div>
        <div className="form-actions">
          <button type="submit" className="primary-button">Save settings</button>
        </div>
      </form>
    </div>
  )
}

function ProductCard({ product, appState, onAddToCart }) {
  const reviews = appState.reviews.filter((review) => review.productId === product.id && review.visible !== false)
  const averageRating = reviews.length
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    : 4.6
  const discount = getProductDiscount(product)

  return (
    <article className="product-card">
      <Link to={`/product/${product.id}`} className="product-image-link">
        <img src={product.primaryImage || product.images?.[0]} alt={product.name} className="product-image" />
        {discount > 0 && <span className="product-badge">{discount}% off</span>}
      </Link>
      <div className="product-card-body">
        <div className="row-between">
          <span className="product-category">{appState.categories.find((category) => category.id === product.categoryId)?.name || 'Category'}</span>
          {product.stock === 0 ? <span className="out-of-stock-badge">Sold out</span> : <span className="in-stock-badge">In stock</span>}
        </div>
        <Link to={`/product/${product.id}`} className="product-name-link">
          <h3>{product.name}</h3>
        </Link>
        <p>{product.shortDescription}</p>
        <div className="rating-row">
          <span>{'★'.repeat(Math.round(averageRating))}{'☆'.repeat(5 - Math.round(averageRating))}</span>
          <small>{reviews.length} reviews</small>
        </div>
        <div className="price-row product-price-row">
          <strong>{formatCurrency(product.price)}</strong>
          <span>{formatCurrency(product.mrp)}</span>
        </div>
        <div className="product-actions-row">
          <button type="button" className="primary-button small" onClick={(event) => { event.preventDefault(); onAddToCart(product) }}>
            Add to cart
          </button>
        </div>
      </div>
    </article>
  )
}

function ProductRow({ products, appState, onAddToCart }) {
  return (
    <div className="product-row">
      {products.length ? (
        products.map((product) => <ProductCard key={product.id} product={product} appState={appState} onAddToCart={onAddToCart} />)
      ) : (
        <EmptyState title="No products available" description="This section will populate as soon as products are added by the seller." />
      )}
    </div>
  )
}

function CartPage({ appState, onUpdateCartItem, onRemoveFromCart, onClearCart }) {
  const subtotal = appState.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItems = appState.cart.reduce((sum, item) => sum + item.quantity, 0)
  const [checkoutState, setCheckoutState] = useState('')

  const handleCheckout = () => {
    if (!appState.cart.length) {
      setCheckoutState('Your cart is empty. Add products before checkout.')
      return
    }

    setCheckoutState('Order placed successfully. We will contact you for confirmation.')
    onClearCart()
  }

  return (
    <div className="container cart-page">
      <div className="section-header cart-header">
        <div>
          <span className="eyebrow">Your basket</span>
          <h2>Cart</h2>
        </div>
        <p>{totalItems} item{totalItems === 1 ? '' : 's'} selected</p>
      </div>

      {appState.cart.length ? (
        <div className="cart-grid">
          <div className="cart-list">
            {appState.cart.map((item) => (
              <div key={item.id} className="cart-item-card">
                <img src={item.image} alt={item.name} className="cart-item-image" />
                <div className="cart-item-details">
                  <div className="cart-item-row">
                    <h3>{item.name}</h3>
                    <button type="button" className="link-button destructive" onClick={() => onRemoveFromCart(item.productId)}>Remove</button>
                  </div>
                  <p>{formatCurrency(item.price)} each</p>
                  <div className="cart-quantity-row">
                    <button type="button" onClick={() => onUpdateCartItem(item.productId, item.quantity - 1)}>-</button>
                    <span>{item.quantity}</span>
                    <button type="button" onClick={() => onUpdateCartItem(item.productId, item.quantity + 1)}>+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <aside className="checkout-panel">
            <h3>Order summary</h3>
            <div className="summary-row">
              <span>Items</span>
              <strong>{totalItems}</strong>
            </div>
            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <div className="summary-row total-row">
              <span>Total</span>
              <strong>{formatCurrency(subtotal)}</strong>
            </div>
            <button type="button" className="primary-button full-width" onClick={handleCheckout}>Checkout</button>
            <button type="button" className="secondary-button full-width" onClick={onClearCart}>Clear cart</button>
            {checkoutState && <p className="success-message">{checkoutState}</p>}
          </aside>
        </div>
      ) : (
        <div className="empty-state cart-empty-state">
          <h3>Your cart is empty</h3>
          <p>Add products to start building your order.</p>
          <Link to="/shop" className="primary-button">Continue shopping</Link>
        </div>
      )}
    </div>
  )
}

function CartDrawer({ isOpen, items, subtotal, onClose, onUpdateQuantity, onRemove }) {
  if (!isOpen) return null

  return (
    <div className="cart-backdrop" onClick={onClose}>
      <aside className="cart-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="cart-header">
          <h3>Your cart</h3>
          <button type="button" className="close-modal" onClick={onClose} aria-label="Close cart">×</button>
        </div>

        {items.length ? (
          <>
            <div className="cart-items">
              {items.map((item) => (
                <div key={item.id} className="cart-item">
                  <img src={item.image} alt={item.name} />
                  <div className="cart-item-copy">
                    <strong>{item.name}</strong>
                    <span>{formatCurrency(item.price)}</span>
                    <div className="cart-quantity-row">
                      <button type="button" onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}>-</button>
                      <span>{item.quantity}</span>
                      <button type="button" onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}>+</button>
                    </div>
                  </div>
                  <button type="button" className="link-button destructive" onClick={() => onRemove(item.productId)}>Remove</button>
                </div>
              ))}
            </div>
            <div className="cart-summary">
              <div className="row-between">
                <span>Subtotal</span>
                <strong>{formatCurrency(subtotal)}</strong>
              </div>
              <Link to="/cart" className="primary-button" onClick={onClose}>View cart</Link>
            </div>
          </>
        ) : (
          <div className="empty-state compact cart-empty">
            <h3>Your cart is empty</h3>
            <p>Add products to start building your shortlist.</p>
          </div>
        )}
      </aside>
    </div>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div className="section-header">
      <div>
        <span className="eyebrow">Curated collection</span>
        <h2>{title}</h2>
      </div>
      {subtitle && <p>{subtitle}</p>}
    </div>
  )
}

function MetricCard({ label, value, caption }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{caption}</small>
    </div>
  )
}

function EmptyState({ title, description, compact = false }) {
  return (
    <div className={`empty-state ${compact ? 'compact' : ''}`}>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  )
}

export default App
