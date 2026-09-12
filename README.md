# HERLO — Native Social Commerce

A native React Native / Expo mobile application for a women-centered social-commerce ecosystem: community, shops, sellers, AI shopping assistant, messaging, auctions, payments, delivery and creator/seller tools.

## What is included in this repository

### Mobile app
- Home with editorial campaign banners, product discovery, popular sellers and feed previews
- Shop with swipeable category hero and filters
- Community feed with composer, live area, repost-ready content model and discovery tabs
- Real-time-chat-ready inbox and conversations, including Lumi entry inside chat
- Lumi AI screen with contextual marketplace suggestions
- Profiles with posts/shop/services tabs, followers, links and seller entry
- Product details, local/imported fulfillment, seller identity, buy/bid flows
- Checkout requiring delivery location before payment
- Delivery tracking UI with live-map-ready state and rider progress
- Auctions/bidding UI
- Notifications
- Seller Studio, analytics, rewards, monetization and verification screens
- Privacy, security, appearance and terms screens
- Search, create-post and new-message flows
- Native-safe-area layouts, touch-first controls and animated Lumi FAB

### Backend
- Express API with Helmet/CORS
- Products, sellers, feed, posts, AI chat, orders, delivery quote adapter, auctions and notifications endpoints
- Socket.IO rooms for messages, typing and auction events
- Zod request validation
- Provider abstraction points for Paystack and Yango
- Supabase-ready relational schema in `supabase/schema.sql`

### Design
The supplied references are used as visual direction, not copied templates. The system intentionally avoids repetitive generic cards and uses editorial banners, organic geometry, strong solid color combinations, imagery, layered sections and a consistent feminine art direction.

## Run

```bash
npm install
npm run api
npm start
```

For a physical phone, set:

```bash
EXPO_PUBLIC_API_URL=http://YOUR-LAN-IP:4100
```

## Production connection points

The application is deliberately built so external providers remain replaceable infrastructure:

- **Supabase:** authentication, PostgreSQL, storage and realtime
- **Paystack:** payment initialization, verification, splits/subaccounts and refunds
- **Yango:** live delivery quotes and tracking adapter
- **Maps:** location autocomplete, geocoding and route display
- **Push:** FCM/APNs/Expo notifications
- **AI:** provider with tool calling against Herlo inventory and seller reputation
- **International suppliers:** supplier adapter keyed by source + supplier SKU

Do not place provider secret keys in the mobile app. Secrets belong on the backend.

## Important

The repository contains a working native application and a runnable backend with provider-ready adapters. Real Paystack/Yango/Supabase behavior requires the owner's credentials, project IDs and approved API access; those cannot be fabricated safely in a source repository.
