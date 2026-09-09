# ZARONA UNISEX

<div align="center">
  <h3>Timeless Styles. For Every You.</h3>
  <p>A minimalist luxury e-commerce storefront for premium unisex streetwear and tailored apparel.</p>

  <p>
    <img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" alt="HTML5" />
    <img src="https://img.shields.io/badge/Vanilla_CSS-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3" />
    <img src="https://img.shields.io/badge/JavaScript_ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript" />
    <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite" />
  </p>
</div>

---

## ✦ Overview

**Zarona Unisex** is a client storefront designed with an editorial, high-fashion aesthetic. Rooted in quiet luxury, earthy neutral palettes (`#F8F5EE`, `#141312`, `#C2A26F`), and heavyweight tactile silhouettes, the store offers a fluid, responsive shopping experience across desktop, tablet, and mobile screens.

---

## ✦ Key Features

### 1. Editorial Home Page (`index.html`)
- **Luxury Announcement Bar**: Free shipping notifications and return guarantees.
- **Hero Showcase**: High-impact editorial imagery with *"Wear Your Own Identity"* headline, archival "Z" monogram branding, and seamless action CTA.
- **Value Guarantees**: 4-column trust signals (Free Worldwide Shipping over $50, Hassle-Free 7-Day Returns, 100% Secure Payments, and Premium Quality).
- **New Arrivals Spotlight**: Real-time product cards featuring badges, pricing, color variant selectors, and quick actions.
- **Curated Category Grid**: Visual collection teasers for Heavyweight Hoodies, Oversized Tees, and Corduroy Outerwear.
- **Brand Story & Private Drops**: Editorial philosophy section with an integrated newsletter subscription form.

### 2. Collection & Shop Page (`shop.html`)
- **Multi-Facet Filter Sidebar**:
  - **Category Filter**: Checkbox filters with live counters for *T-Shirts*, *Hoodies*, *Sweatshirts*, *Shirts*, *Pants*, *Jackets*, and *Accessories*.
  - **Size Selector**: Multi-select pills (`XS`, `S`, `M`, `L`, `XL`, `XXL`).
  - **Color Swatches**: Visual color dots for interactive swatch selection.
  - **Price Range Slider**: Real-time interactive price ceiling filter ($0 – $100+).
  - **`< Clear Filters`**: Instant single-click filter reset.
- **Sorting Controls**: Sort by *Newest*, *Best Selling*, *Price: Low to High*, or *Price: High to Low*.
- **Responsive Controls**: Mobile-friendly filter drawer for smaller screens.

### 3. Interactive Shopping Components
- **Slide-out Cart Drawer**:
  - Live quantity steppers (`+` / `−`) and item removal.
  - **Dynamic Free Shipping Bar**: Calculates real-time progress toward the $50 free shipping milestone.
  - Subtotal calculation with `localStorage` persistence.
- **Quick View Modal**: Inspect garment details, view composition & care, pick sizes and colors, and add directly to the bag.
- **Instant Search Overlay**: Modal search with autocomplete suggestions and live product matching.
- **Mobile Navigation Drawer**: Smooth slide-over navigation matching the mobile design layout.

---

## ✦ Project Structure

```
Zarona/
├── assets/
│   └── images/
│       ├── catalog/              # High-res raw model lookbook crops
│       ├── products/             # Standardized 4:5 luxury product imagery
│       ├── hero_banner_seamless.jpg  # Hero composite visual
│       └── models.png            # Official lookbook contact sheet
├── css/
│   └── style.css                 # Core design system tokens, typography & components
├── js/
│   ├── products.js               # Structured catalog data (names, prices, colors, sizes)
│   └── main.js                   # Cart state, filtering engine, modals & drawers
├── index.html                    # Storefront Home page
├── shop.html                     # Collection / Catalog page
├── package.json                  # Scripts & Vite configuration
├── .gitignore                    # Ignored artifacts & node_modules
└── README.md                     # Documentation
```

---

## ✦ Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/tek-sys-hub/zarona.git
   cd zarona
   ```

2. Install development dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to view the site.

4. Build for production:
   ```bash
   npm run build
   ```

---

## ✦ Design System & Palette

| Token | Value | Description |
| :--- | :--- | :--- |
| `--bg-primary` | `#F8F5EE` | Warm Ivory / Ecru Canvas |
| `--bg-secondary` | `#F1ECE1` | Soft Sand Surface |
| `--bg-dark` | `#141312` | Noir Charcoal Background |
| `--text-primary` | `#121212` | Editorial Deep Black |
| `--text-secondary` | `#635E57` | Muted Earth Gray |
| `--accent-gold` | `#C2A26F` | Vintage Champagne Gold Accent |
| `--border-light` | `#E7E2D6` | Subtle Divider Stroke |

**Typography**:
- *Headings*: `'Cormorant Garamond', Georgia, serif`
- *Body & UI*: `'Plus Jakarta Sans', sans-serif`

---

## ✦ License

Private repository. All rights reserved by **Zarona Unisex**.
