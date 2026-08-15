export const STORAGE_KEY = 'zenish-enterprises-v2'
export const BUYER_ACCOUNT_KEY = 'zenish-buyer-accounts'
export const BUYER_SESSION_KEY = 'zenish-buyer-session'
export const GUEST_CART_KEY = 'zenish-buyer-guest-cart'
export const SELLER_EMAIL = 'Zenish.support@gmail.com'
export const SELLER_PASSWORD = 'Arsh786#'
export const DEFAULT_BUYER_ACCOUNT = {
  id: 'buyer-demo',
  name: 'Demo Buyer',
  email: 'buyer@zenish.com',
  password: 'Zenish@123',
}

export const defaultSettings = {
  businessName: 'ZENISH ENTERPRISES',
  heroTitle: 'Curated essentials for elegant living.',
  heroSubtitle:
    'Premium home, décor, and lifestyle pieces selected for modern Indian homes.',
  heroImage:
    'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
  announcementText: 'New collection arrivals now live across home décor and gifting essentials.',
  featuredTitle: 'Featured Highlights',
  brandDescription:
    'Zenish Enterprises brings premium everyday essentials to homes that value craftsmanship, beauty, and practicality.',
  contactName: 'Zenish Enterprises',
  contactEmail: 'Zenish.support@gmail.com',
  contactPhone: '8791025886',
  address: 'Bengaluru, India',
  socialLinks: {
    instagram: 'https://instagram.com',
    facebook: 'https://facebook.com',
    youtube: 'https://youtube.com',
  },
  amazonStoreLink: 'https://www.amazon.in',
  flipkartStoreLink: 'https://www.flipkart.com',
  footerText: 'Premium essentials, thoughtfully selected for modern living.',
}

export const defaultCategories = [
  { id: 'home-decor', name: 'Home & Decor', description: 'Elevated living essentials', active: true },
  { id: 'kitchen', name: 'Kitchen', description: 'Functional everyday pieces', active: true },
  { id: 'gifting', name: 'Gifting', description: 'Thoughtful premium gifting', active: true },
  { id: 'storage', name: 'Storage & Utility', description: 'Organised, practical spaces', active: true },
]

const MAX_LOCAL_STORAGE_BYTES = 4_200_000

export function sanitizeAppStateForStorage(data) {
  if (!data || typeof data !== 'object') return data

  const next = { ...data }

  if (Array.isArray(next.products)) {
    next.products = next.products.map((product) => {
      if (!product || typeof product !== 'object') return product

      const normalized = { ...product }

      if (Array.isArray(normalized.images)) {
        normalized.images = normalized.images.filter(Boolean).filter((image) => {
          if (typeof image !== 'string') return false
          return !image.startsWith('data:') || image.length < 350000
        })

        if (normalized.images.length) {
          normalized.primaryImage = normalized.primaryImage || normalized.images[0]
        } else {
          normalized.primaryImage = ''
        }
      }

      if (typeof normalized.video === 'string' && normalized.video.startsWith('data:') && normalized.video.length > 250000) {
        normalized.video = ''
      }

      return normalized
    })
  }

  return next
}

export const defaultProducts = [
  {
    id: 'prod-wooden-tray',
    name: 'Wooden Serving Tray',
    shortDescription: 'Hand-finished tray with natural grain detailing.',
    description:
      'Crafted to bring warmth and character to everyday hosting, this serving tray pairs a premium finish with practical functionality.',
    categoryId: 'home-decor',
    price: 899,
    mrp: 1199,
    stock: 24,
    sku: 'ZEN-TRAY-01',
    material: 'Solid wood and lacquer finish',
    dimensions: '42 x 30 x 4 cm',
    weight: '1.2 kg',
    specs: 'Natural wood grain\nScratch-resistant finish\nIdeal for serving and decor',
    customSpecifications: 'Suitable for tea, snacks, and display styling',
    amazonUrl: 'https://www.amazon.in',
    flipkartUrl: 'https://www.flipkart.com',
    featured: true,
    newArrival: true,
    bestseller: false,
    offer: true,
    status: 'active',
    demo: true,
    images: [
      'https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80',
    ],
    primaryImage:
      'https://images.unsplash.com/photo-1517705008128-361805f42e86?auto=format&fit=crop&w=900&q=80',
    video: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    variations: [{ id: makeId('variation'), name: 'Size', options: ['Small', 'Medium', 'Large'] }],
    seoTitle: 'Wooden Serving Tray | Zenish Enterprises',
    seoDescription: 'Premium handcrafted serving tray for stylish hosting and home décor.',
    keywords: 'wooden serving tray, home decor, premium serving accessories',
  },
  {
    id: 'prod-ceramic-vase',
    name: 'Ceramic Accent Vase',
    shortDescription: 'Modern sculptural vase crafted for statement displays.',
    description:
      'This accent vase adds character to a console table, shelf, or room corner with a refined contemporary profile.',
    categoryId: 'home-decor',
    price: 1299,
    mrp: 1699,
    stock: 18,
    sku: 'ZEN-VASE-02',
    material: 'Ceramic with matte glaze',
    dimensions: '28 x 18 cm',
    weight: '0.9 kg',
    specs: 'Matte texture\nContemporary silhouette\nIndoor décor ready',
    customSpecifications: 'Perfect for faux stems, dried flowers, or empty styling',
    amazonUrl: '',
    flipkartUrl: 'https://www.flipkart.com',
    featured: true,
    newArrival: false,
    bestseller: true,
    offer: true,
    status: 'active',
    demo: true,
    images: [
      'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?auto=format&fit=crop&w=900&q=80',
    ],
    primaryImage:
      'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=900&q=80',
    video: '',
    variations: [{ id: makeId('variation'), name: 'Design', options: ['Classic', 'Floral', 'Royal'] }],
    seoTitle: 'Ceramic Accent Vase | Zenish Enterprises',
    seoDescription: 'Modern ceramic accent vase designed for elegant home styling.',
    keywords: 'ceramic vase, home decor, modern accent decor',
  },
  {
    id: 'prod-bamboo-basket',
    name: 'Bamboo Utility Basket',
    shortDescription: 'Versatile storage basket with a clean, airy finish.',
    description:
      'A practical and stylish basket designed for tidy storage while elevating the mood of bedrooms, entries, and utility spaces.',
    categoryId: 'storage',
    price: 699,
    mrp: 949,
    stock: 0,
    sku: 'ZEN-BASKET-03',
    material: 'Natural bamboo and cotton rope',
    dimensions: '30 x 22 x 18 cm',
    weight: '0.75 kg',
    specs: 'Lightweight\nNaturally textured\nMulti-purpose storage',
    customSpecifications: 'Works for household essentials, linens, and daily clutter',
    amazonUrl: 'https://www.amazon.in',
    flipkartUrl: '',
    featured: false,
    newArrival: true,
    bestseller: false,
    offer: false,
    status: 'active',
    demo: true,
    images: [
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
    ],
    primaryImage:
      'https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80',
    video: '',
    variations: [{ id: makeId('variation'), name: 'Set', options: ['Set of 2', 'Set of 4', 'Set of 6'] }],
    seoTitle: 'Bamboo Utility Basket | Zenish Enterprises',
    seoDescription: 'Premium bamboo utility basket for neat organization and modern home styling.',
    keywords: 'bamboo basket, storage basket, utility storage',
  },
  {
    id: 'prod-metal-jar',
    name: 'Premium Glass Jar Set',
    shortDescription: 'Elegant storage jars for pantry organization.',
    description:
      'This set blends practicality with elevated design, making it ideal for dry storage and beautiful kitchen styling.',
    categoryId: 'kitchen',
    price: 1599,
    mrp: 2099,
    stock: 12,
    sku: 'ZEN-JAR-04',
    material: 'Glass with metal lid',
    dimensions: '12 x 12 x 18 cm each',
    weight: '1.1 kg per set',
    specs: 'Air-tight lid\nGlass body\nKitchen-safe',
    customSpecifications: 'Suitable for grains, tea, snacks, and pantry display',
    amazonUrl: '',
    flipkartUrl: 'https://www.flipkart.com',
    featured: false,
    newArrival: false,
    bestseller: true,
    offer: true,
    status: 'active',
    demo: true,
    images: [
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
    ],
    primaryImage:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80',
    video: '',
    variations: [{ id: makeId('variation'), name: 'Set', options: ['Set of 2', 'Set of 4'] }],
    seoTitle: 'Glass Jar Set | Zenish Enterprises',
    seoDescription: 'Premium pantry storage jars with elegant glass finish and secure lids.',
    keywords: 'glass jar set, pantry jars, kitchen storage',
  },
]

export const defaultReviews = [
  {
    id: 'rev-1',
    productId: 'prod-wooden-tray',
    customer: 'Priya S.',
    rating: 5,
    review: 'Beautiful quality and exactly as pictured. It feels premium and practical.',
    demo: true,
    visible: true,
  },
  {
    id: 'rev-2',
    productId: 'prod-ceramic-vase',
    customer: 'Rohan V.',
    rating: 4,
    review: 'Love the design and material finish. It looks elegant in the living room.',
    demo: true,
    visible: true,
  },
]

export const defaultMessages = [
  {
    id: 'msg-1',
    productId: 'prod-ceramic-vase',
    name: 'Nisha K.',
    email: 'nisha@example.com',
    question: 'Is this vase suitable for real flowers as well?',
    status: 'new',
    createdAt: '2026-08-11',
  },
]

export const defaultTeamMembers = [
  {
    id: 'team-president',
    name: 'Shahzeb',
    position: 'President',
    age: 28,
  },
  {
    id: 'team-manager',
    name: 'Arsh',
    position: 'Operating Manager',
    age: 20,
  },
]

export const createDefaultState = () => ({
  settings: defaultSettings,
  categories: defaultCategories,
  products: defaultProducts,
  reviews: defaultReviews,
  messages: defaultMessages,
  team: defaultTeamMembers,
  cart: [],
  sellerSession: { isLoggedIn: false },
  buyerSession: { isLoggedIn: false, name: '', email: '' },
})

export function makeId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

export function buildProductForm(categoryId = '') {
  return {
    id: '',
    name: '',
    shortDescription: '',
    description: '',
    categoryId,
    price: '',
    mrp: '',
    stock: '',
    sku: '',
    material: '',
    dimensions: '',
    weight: '',
    specs: '',
    customSpecifications: '',
    amazonUrl: '',
    flipkartUrl: '',
    featured: false,
    newArrival: false,
    bestseller: false,
    offer: false,
    status: 'active',
    seoTitle: '',
    seoDescription: '',
    keywords: '',
    images: [],
    primaryImage: '',
    video: '',
    variations: [{ id: makeId('variation'), name: 'Size', options: ['Small', 'Medium', 'Large'] }],
  }
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

export function getProductDiscount(product) {
  if (!product || !product.mrp || !product.price) return 0
  return Math.round(((Number(product.mrp) - Number(product.price)) / Number(product.mrp)) * 100)
}

export function getBuyerCartKey(email = '') {
  const safeEmail = email.trim().toLowerCase()
  return safeEmail ? `zenish-buyer-cart-${safeEmail}` : GUEST_CART_KEY
}

export function loadBuyerAccounts() {
  try {
    const raw = window.localStorage.getItem(BUYER_ACCOUNT_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    const accounts = Array.isArray(parsed) ? parsed : []
    const hasDefault = accounts.some((account) => account.email?.toLowerCase() === DEFAULT_BUYER_ACCOUNT.email.toLowerCase())
    return hasDefault ? accounts : [DEFAULT_BUYER_ACCOUNT, ...accounts]
  } catch {
    return [DEFAULT_BUYER_ACCOUNT]
  }
}

export function saveBuyerAccounts(accounts) {
  try {
    window.localStorage.setItem(BUYER_ACCOUNT_KEY, JSON.stringify(accounts))
  } catch (error) {
    console.warn('Unable to persist buyer accounts', error)
  }
}

export function loadBuyerSession() {
  try {
    const raw = window.localStorage.getItem(BUYER_SESSION_KEY)
    if (!raw) return { isLoggedIn: false, name: '', email: '' }
    const parsed = JSON.parse(raw)
    return {
      isLoggedIn: Boolean(parsed?.isLoggedIn),
      name: parsed?.name || '',
      email: parsed?.email || '',
    }
  } catch {
    return { isLoggedIn: false, name: '', email: '' }
  }
}

export function saveBuyerSession(session) {
  try {
    window.localStorage.setItem(BUYER_SESSION_KEY, JSON.stringify(session || { isLoggedIn: false, name: '', email: '' }))
  } catch (error) {
    console.warn('Unable to persist buyer session', error)
  }
}

export function getStoredBuyerCart(email = '') {
  try {
    const key = getBuyerCartKey(email)
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function persistBuyerCart(cart, email = '') {
  try {
    window.localStorage.setItem(getBuyerCartKey(email), JSON.stringify(cart || []))
  } catch (error) {
    console.warn('Unable to persist buyer cart', error)
  }
}

export function loadAppState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return createDefaultState()
    }

    const parsed = JSON.parse(raw)
    const buyerSession = {
      isLoggedIn: Boolean(parsed?.buyerSession?.isLoggedIn),
      name: parsed?.buyerSession?.name || '',
      email: parsed?.buyerSession?.email || '',
    }

    const cart = buyerSession.email ? (parsed?.cart || getStoredBuyerCart(buyerSession.email)) : (parsed?.cart || getStoredBuyerCart(''))

    return {
      ...createDefaultState(),
      ...parsed,
      settings: { ...defaultSettings, ...(parsed.settings || {}) },
      categories: parsed.categories || defaultCategories,
      products: parsed.products || defaultProducts,
      reviews: parsed.reviews || defaultReviews,
      messages: parsed.messages || defaultMessages,
      team: parsed.team || defaultTeamMembers,
      cart,
      sellerSession: { isLoggedIn: Boolean(parsed?.sellerSession?.isLoggedIn) },
      buyerSession,
    }
  } catch {
    return createDefaultState()
  }
}

export function saveAppState(data) {
  try {
    const sanitized = sanitizeAppStateForStorage(data)
    const serialized = JSON.stringify(sanitized)

    if (serialized.length > MAX_LOCAL_STORAGE_BYTES) {
      const fallback = sanitizeAppStateForStorage({
        ...sanitized,
        products: (sanitized.products || []).map((product) => ({
          ...product,
          video: '',
          images: Array.isArray(product.images) ? product.images.slice(0, 1) : [],
          primaryImage: Array.isArray(product.images) && product.images[0] ? product.images[0] : '',
        })),
      })

      const compact = JSON.stringify(fallback)
      if (compact.length > MAX_LOCAL_STORAGE_BYTES) {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...createDefaultState(), products: (sanitized.products || []).slice(0, 1) }),
        )
        return
      }

      window.localStorage.setItem(STORAGE_KEY, compact)
      return
    }

    window.localStorage.setItem(STORAGE_KEY, serialized)
  } catch (error) {
    console.warn('Unable to persist Zenish state', error)
  }
}
