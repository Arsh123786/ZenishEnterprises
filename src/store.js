import { supabase } from './supabaseClient'

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
  products: [],
  reviews: defaultReviews,
  messages: defaultMessages,
  team: defaultTeamMembers,
  cart: [],
  sellerSession: { isLoggedIn: false },
  buyerSession: { isLoggedIn: false, name: '', email: '' },
})

export function toDbProduct(product = {}) {
  return {
    id: product.id || makeId('product'),
    name: product.name || '',
    short_description: product.shortDescription || '',
    description: product.description || '',
    category_id: product.categoryId || '',
    price: Number(product.price || 0),
    mrp: Number(product.mrp || 0),
    stock: Number(product.stock || 0),
    sku: product.sku || '',
    material: product.material || '',
    dimensions: product.dimensions || '',
    weight: product.weight || '',
    specs: product.specs || '',
    custom_specifications: product.customSpecifications || '',
    amazon_url: product.amazonUrl || '',
    flipkart_url: product.flipkartUrl || '',
    featured: Boolean(product.featured),
    new_arrival: Boolean(product.newArrival),
    bestseller: Boolean(product.bestseller),
    offer: Boolean(product.offer),
    status: product.status || 'active',
    primary_image: product.primaryImage || product.images?.[0] || '',
    images: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
    video: product.video || '',
    variations: Array.isArray(product.variations) ? product.variations : [],
    seo_title: product.seoTitle || product.name || '',
    seo_description: product.seoDescription || product.shortDescription || '',
    keywords: product.keywords || product.name || '',
    updated_at: new Date().toISOString(),
    created_at: product.createdAt || new Date().toISOString(),
  }
}

export function fromDbProduct(row) {
  if (!row) return null

  return {
    id: row.id,
    name: row.name || '',
    shortDescription: row.short_description || '',
    description: row.description || '',
    categoryId: row.category_id || '',
    price: Number(row.price || 0),
    mrp: Number(row.mrp || 0),
    stock: Number(row.stock || 0),
    sku: row.sku || '',
    material: row.material || '',
    dimensions: row.dimensions || '',
    weight: row.weight || '',
    specs: row.specs || '',
    customSpecifications: row.custom_specifications || '',
    amazonUrl: row.amazon_url || '',
    flipkartUrl: row.flipkart_url || '',
    featured: Boolean(row.featured),
    newArrival: Boolean(row.new_arrival),
    bestseller: Boolean(row.bestseller),
    offer: Boolean(row.offer),
    status: row.status || 'active',
    seoTitle: row.seo_title || row.name || '',
    seoDescription: row.seo_description || row.short_description || '',
    keywords: row.keywords || row.name || '',
    images: Array.isArray(row.images) ? row.images.filter(Boolean) : [],
    primaryImage: row.primary_image || (Array.isArray(row.images) && row.images[0]) || '',
    video: row.video || '',
    variations: Array.isArray(row.variations) ? row.variations : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    demo: false,
  }
}

export async function fetchProductsFromDatabase() {
  if (!supabase) return []

  const { data, error } = await supabase.from('products').select('*').order('updated_at', { ascending: false })

  if (error) {
    console.error('Unable to load products from Supabase', error)
    return []
  }

  return (data || []).map(fromDbProduct).filter(Boolean)
}

export async function upsertProductInDatabase(product) {
  if (!supabase) return null

  const payload = toDbProduct(product)
  const { data, error } = await supabase.from('products').upsert(payload, { onConflict: 'id' }).select().single()

  if (error) {
    console.error('Unable to save product to Supabase', error)
    return null
  }

  return fromDbProduct(data)
}

export async function deleteProductFromDatabase(productId) {
  if (!supabase) return false

  const { error } = await supabase.from('products').delete().eq('id', productId)

  if (error) {
    console.error('Unable to delete product from Supabase', error)
    return false
  }

  return true
}

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
      products: [],
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
    if (!data || typeof data !== 'object') return

    const { products: _products, ...persistedState } = data
    const sanitized = sanitizeAppStateForStorage(persistedState)
    const serialized = JSON.stringify(sanitized)

    if (serialized.length > MAX_LOCAL_STORAGE_BYTES) {
      const fallback = sanitizeAppStateForStorage({
        ...sanitized,
        messages: [],
        reviews: [],
      })

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
      return
    }

    window.localStorage.setItem(STORAGE_KEY, serialized)
  } catch (error) {
    console.warn('Unable to persist Zenish state', error)
  }
}
