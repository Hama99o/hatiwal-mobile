import { http, HttpResponse } from "msw";

const BASE = "http://localhost:3007/api/v1";

// ─── Fixtures ──────────────────────────────────────────────────────────────

export const MOCK_USER = {
  id: 1,
  email: "buyer@hatiwal.test",
  firstname: "Ahmad",
  lastname: "Karimi",
  full_name: "Ahmad Karimi",
  city: "Kabul",
  province: "Kabul",
  phone: "+93700000111",
  bio: null,
  latitude: null,
  longitude: null,
  avatar_url: null,
  preferred_language: "en",
  preferred_theme: "system",
  seller_mode: false,
  status: "active",
  verified: false,
  items_active_count: 0,
  items_sold_count: 0,
  unread_message_count: 0,
  saved_items_count: 2,
  items_bought_count: 0,
  created_at: "2026-01-01T00:00:00Z",
};

export const MOCK_LISTING = {
  id: 10,
  title: "iPhone 12 Pro",
  description: "Good condition",
  price: 25000,
  currency: "AFN",
  condition: "like_new",
  status: "active",
  category_id: 1,
  location: "Kabul",
  address: null,
  latitude: null,
  longitude: null,
  thumbnail_url: null,
  image_urls: [],
  views_count: 10,
  conversations_count: 2,
  saves_count: 3,
  is_saved: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  seller: {
    id: 2,
    name: "Omar Noori",
    city: "Kandahar",
    phone: null,
    verified: false,
    avatar_url: null,
  },
  category: {
    id: 1,
    name_en: "Electronics",
    name_ps: "برقی وسایل",
    name_fa: "وسایل برقی",
    slug: "electronics",
  },
};

export const MOCK_PAGINATION = {
  current_page: 1,
  next_page: null,
  prev_page: null,
  total_count: 1,
  total_pages: 1,
};

export const AUTH_HEADERS = {
  "access-token": "token123",
  client: "client123",
  uid: "buyer@hatiwal.test",
  "token-type": "Bearer",
  expiry: "9999999999",
};

// ─── Auth handlers ──────────────────────────────────────────────────────────

const authHandlers = [
  http.post(`${BASE}/auth/sign_in`, () =>
    HttpResponse.json({ data: MOCK_USER }, { headers: AUTH_HEADERS })
  ),

  http.post(`${BASE}/auth/`, () =>
    HttpResponse.json({ data: MOCK_USER }, { headers: AUTH_HEADERS })
  ),

  http.delete(`${BASE}/auth/sign_out`, () =>
    HttpResponse.json({ success: true })
  ),

  http.get(`${BASE}/auth/validate_token`, () =>
    HttpResponse.json({ data: MOCK_USER })
  ),

  http.get(`${BASE}/users/me`, () =>
    HttpResponse.json({ user: MOCK_USER })
  ),

  http.put(`${BASE}/users/me`, () =>
    HttpResponse.json({ user: MOCK_USER })
  ),
];

// ─── Listings handlers ───────────────────────────────────────────────────────

const listingsHandlers = [
  http.get(`${BASE}/listings`, () =>
    HttpResponse.json({
      listings: [MOCK_LISTING],
      meta: { pagination: MOCK_PAGINATION },
    })
  ),

  http.get(`${BASE}/listings/:id/similar`, ({ params }) =>
    HttpResponse.json({
      listings: [
        { ...MOCK_LISTING, id: Number(params.id) + 1 },
        { ...MOCK_LISTING, id: Number(params.id) + 2 },
      ],
    })
  ),

  http.get(`${BASE}/listings/:id`, ({ params }) =>
    HttpResponse.json({ listing: { ...MOCK_LISTING, id: Number(params.id) } })
  ),

  http.post(`${BASE}/listings/:id/save`, () =>
    HttpResponse.json({}, { status: 201 })
  ),

  http.delete(`${BASE}/listings/:id/unsave`, () =>
    HttpResponse.json({}, { status: 200 })
  ),

  // TASK-H528 — "Not interested" hide / unhide
  http.post(`${BASE}/listings/:id/hide`, () =>
    HttpResponse.json({ hidden: true, id: 1 }, { status: 200 })
  ),

  http.delete(`${BASE}/listings/:id/unhide`, () =>
    HttpResponse.json({ hidden: false }, { status: 200 })
  ),

  // My listings
  http.get(`${BASE}/my/listings`, () =>
    HttpResponse.json({
      listings: [MOCK_LISTING],
      meta: { pagination: MOCK_PAGINATION },
    })
  ),

  http.get(`${BASE}/my/listings/:id`, ({ params }) =>
    HttpResponse.json({ listing: { ...MOCK_LISTING, id: Number(params.id) } })
  ),

  http.post(`${BASE}/my/listings`, () =>
    HttpResponse.json({ listing: MOCK_LISTING }, { status: 201 })
  ),

  http.put(`${BASE}/my/listings/:id`, ({ params }) =>
    HttpResponse.json({ listing: { ...MOCK_LISTING, id: Number(params.id) } })
  ),

  http.delete(`${BASE}/my/listings/:id`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  http.put(`${BASE}/my/listings/:id/publish`, ({ params }) =>
    HttpResponse.json({ listing: { ...MOCK_LISTING, id: Number(params.id), status: "active" } })
  ),

  http.put(`${BASE}/my/listings/:id/unpublish`, ({ params }) =>
    HttpResponse.json({ listing: { ...MOCK_LISTING, id: Number(params.id), status: "draft" } })
  ),

  http.put(`${BASE}/my/listings/:id/reserve`, ({ params }) =>
    HttpResponse.json({ listing: { ...MOCK_LISTING, id: Number(params.id), status: "reserved" } })
  ),

  http.put(`${BASE}/my/listings/:id/activate`, ({ params }) =>
    HttpResponse.json({ listing: { ...MOCK_LISTING, id: Number(params.id), status: "active" } })
  ),

  http.put(`${BASE}/my/listings/:id/sold`, ({ params }) =>
    HttpResponse.json({ listing: { ...MOCK_LISTING, id: Number(params.id), status: "sold" } })
  ),

  http.put(`${BASE}/my/listings/:id/renew`, ({ params }) =>
    HttpResponse.json({ listing: { ...MOCK_LISTING, id: Number(params.id) } })
  ),

  http.get(`${BASE}/my/listings/:id/analytics`, () =>
    HttpResponse.json({
      analytics: [
        { date: "2026-06-11", count: 0 },
        { date: "2026-06-12", count: 2 },
        { date: "2026-06-13", count: 5 },
        { date: "2026-06-14", count: 1 },
        { date: "2026-06-15", count: 0 },
        { date: "2026-06-16", count: 3 },
        { date: "2026-06-17", count: 7 },
      ],
    })
  ),

  http.get(`${BASE}/my/saved_listings`, () =>
    HttpResponse.json({
      listings: [MOCK_LISTING],
      meta: {
        pagination: {
          current_page: 1,
          next_page: null,
          prev_page: null,
          total_count: 1,
          total_pages: 1,
        },
      },
    })
  ),

  http.get(`${BASE}/my/viewed_listings`, () =>
    HttpResponse.json({
      listings: [MOCK_LISTING],
      meta: {
        pagination: {
          current_page: 1,
          next_page: null,
          prev_page: null,
          total_count: 1,
          total_pages: 1,
        },
      },
    })
  ),

  // TASK-H528 — hidden listings management list
  http.get(`${BASE}/my/hidden_listings`, () =>
    HttpResponse.json({
      listings: [MOCK_LISTING],
      meta: {
        pagination: {
          current_page: 1,
          next_page: null,
          prev_page: null,
          total_count: 1,
          total_pages: 1,
        },
      },
    })
  ),
];

// ─── Categories handlers ─────────────────────────────────────────────────────

export const MOCK_SUBCATEGORY = {
  id: 11,
  slug: "phones",
  name_en: "Phones",
  name_ps: "موبایلونه",
  name_fa: "تلفن‌ها",
  icon: "📱",
  position: 1,
  parent_id: 1,
  subcategories: [],
};

export const MOCK_CATEGORY = {
  id: 1,
  slug: "electronics",
  name_en: "Electronics",
  name_ps: "برقی وسایل",
  name_fa: "وسایل برقی",
  icon: "laptop",
  position: 1,
  parent_id: null,
  subcategories: [MOCK_SUBCATEGORY],
};

export const MOCK_CATEGORY_EMPTY_SUBCATEGORIES = {
  ...MOCK_CATEGORY,
  subcategories: [],
};

export const MOCK_CATEGORY_WITH_COUNT = {
  ...MOCK_CATEGORY,
  active_listings_count: 5,
};

const categoriesHandlers = [
  http.get(`${BASE}/categories`, ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get("with_counts") === "true") {
      return HttpResponse.json({ categories: [MOCK_CATEGORY_WITH_COUNT] });
    }
    return HttpResponse.json({ categories: [MOCK_CATEGORY] });
  }),
];

// ─── Conversations handlers ──────────────────────────────────────────────────

export const MOCK_MESSAGE = {
  id: 100,
  body: "Hi, is this still available?",
  kind: "text",
  read_at: null,
  created_at: "2026-01-01T10:00:00Z",
  sender: { id: 1, name: "Ahmad Karimi" },
  attachment_url: null,
  responds_to_id: null,
};

export const MOCK_CONVERSATION = {
  id: 50,
  status: "open",
  last_message_at: "2026-01-01T10:00:00Z",
  created_at: "2026-01-01T09:00:00Z",
  listing: {
    id: 10,
    title: "iPhone 12 Pro",
    thumbnail_url: null,
    status: "active",
    price: 25000,
    currency: "AFN",
    location: "Kabul",
  },
  buyer: { id: 1, name: "Ahmad Karimi", city: "Kabul", verified: false, avatar_url: null },
  seller: { id: 2, name: "Omar Noori", city: "Kandahar", verified: false, avatar_url: null },
  other_participant: { id: 2, name: "Omar Noori", city: "Kandahar", verified: false, avatar_url: null },
  last_message_body: "Hi, is this still available?",
  last_message_kind: "text",
  unread_count: 0,
};

const conversationsHandlers = [
  http.get(`${BASE}/conversations`, () =>
    HttpResponse.json({
      conversations: [MOCK_CONVERSATION],
      meta: { pagination: MOCK_PAGINATION },
    })
  ),

  http.get(`${BASE}/conversations/:id`, ({ params }) =>
    HttpResponse.json({ conversation: { ...MOCK_CONVERSATION, id: Number(params.id) } })
  ),

  http.post(`${BASE}/listings/:id/conversations`, () =>
    HttpResponse.json({ conversation: MOCK_CONVERSATION }, { status: 201 })
  ),

  http.get(`${BASE}/conversations/:id/messages`, ({ params }) =>
    HttpResponse.json({
      messages: [MOCK_MESSAGE],
      meta: { pagination: MOCK_PAGINATION },
    })
  ),

  http.post(`${BASE}/conversations/:id/messages`, () =>
    HttpResponse.json({ message: MOCK_MESSAGE }, { status: 201 })
  ),

  http.put(`${BASE}/conversations/:id/messages/mark_read`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  http.put(`${BASE}/conversations/:id/mark_read`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  http.put(`${BASE}/conversations/:id/mark_unread`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  http.put(`${BASE}/conversations/:id/archive`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  http.put(`${BASE}/conversations/:id/unarchive`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  http.delete(`${BASE}/conversations/:id`, () =>
    new HttpResponse(null, { status: 204 })
  ),

  // TASK-M913: soft-delete a message
  http.delete(`${BASE}/conversations/:convId/messages/:msgId`, ({ params }) =>
    HttpResponse.json({
      message: {
        ...MOCK_MESSAGE,
        id: Number(params.msgId),
        body: null,
        attachment_url: null,
        deleted: true,
        deleted_at: "2026-06-27T12:00:00Z",
      },
    })
  ),
];

// ─── Reports handlers ────────────────────────────────────────────────────────

export const MOCK_REPORT = {
  id: 1,
  reason: "spam",
  status: "pending",
  description: "Looks like a scam",
  created_at: "2026-06-01T10:00:00.000Z",
  reportable_type: "Listing",
  reportable_id: 5,
  reportable_label: "Old Phone For Sale",
};

export const MOCK_REPORTS_RESPONSE = {
  reports: [MOCK_REPORT],
  meta: {
    pagination: {
      current_page: 1,
      next_page: null,
      prev_page: null,
      total_count: 1,
      total_pages: 1,
    },
  },
};

const reportsHandlers = [
  http.get(`${BASE}/reports`, () =>
    HttpResponse.json(MOCK_REPORTS_RESPONSE, { status: 200 })
  ),
  http.post(`${BASE}/reports`, () =>
    HttpResponse.json({ message: "Report submitted successfully." }, { status: 201 })
  ),
];

// ─── Users handlers ──────────────────────────────────────────────────────────

export const MOCK_PUBLIC_PROFILE = {
  id: 2,
  name: "Omar Noori",
  full_name: "Omar Noori",
  avatar_url: null,
  city: "Kandahar",
  bio: "Selling quality electronics",
  member_since: "January 2025",
  sold_count: 5,
  listings_count: 3,
  verified: false,
  blocked: false,
  response_rate_percent: 80,
  response_time_label: "within_one_hour",
  last_active_label: "today",
};

const usersHandlers = [
  http.get(`${BASE}/users/:id/public_profile`, ({ params }) =>
    HttpResponse.json({ user: { ...MOCK_PUBLIC_PROFILE, id: Number(params.id) } })
  ),

  http.get(`${BASE}/blocks`, () =>
    HttpResponse.json({ users: [MOCK_PUBLIC_PROFILE] })
  ),

  http.post(`${BASE}/users/:id/block`, () =>
    new HttpResponse(null, { status: 200 })
  ),

  http.delete(`${BASE}/users/:id/block`, () =>
    new HttpResponse(null, { status: 200 })
  ),
];

export const handlers = [
  ...authHandlers,
  ...listingsHandlers,
  ...categoriesHandlers,
  ...conversationsHandlers,
  ...reportsHandlers,
  ...usersHandlers,
];
