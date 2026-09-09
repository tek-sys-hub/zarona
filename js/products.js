// Zarona Unisex Catalog Data
export const products = [
  {
    id: "zarona-tee-01",
    name: "Essential Oversized Tee",
    category: "T-Shirts",
    price: 28.00,
    originalPrice: 35.00,
    badge: "Best Seller",
    rating: 4.9,
    reviewsCount: 142,
    colors: [
      { name: "Noir Black", hex: "#151515", image: "assets/images/products/tee_black.jpg" },
      { name: "Bone White", hex: "#EDE8DF", image: "assets/images/products/tee_white_male.jpg" },
      { name: "Alabaster", hex: "#DCD4C7", image: "assets/images/products/tee_white_female.jpg" }
    ],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    primaryImage: "assets/images/products/tee_black.jpg",
    secondaryImage: "assets/images/products/tee_white_male.jpg",
    description: "Cut from ultra-heavyweight 280GSM organic combed cotton with dropped shoulders and a boxy relaxed silhouette. Finished with subtle tonal embroidered 'Z' signature monogram.",
    details: [
      "100% Organic Combed Cotton (280 GSM)",
      "Relaxed unisex boxy drape",
      "Reinforced ribbed collar that retains shape",
      "Embroidered signature 'Z' monogram on chest",
      "Pre-shrunk to maintain fit wash after wash"
    ],
    isFeatured: true,
    isNew: false
  },
  {
    id: "zarona-hoodie-01",
    name: "Classic Hoodie",
    category: "Hoodies",
    price: 48.00,
    originalPrice: 60.00,
    badge: "Essential",
    rating: 5.0,
    reviewsCount: 218,
    colors: [
      { name: "Noir Black", hex: "#1A1A1A", image: "assets/images/products/hoodie_zip_black.jpg" },
      { name: "Charcoal Heather", hex: "#484440", image: "assets/images/products/hoodie_charcoal.jpg" },
      { name: "Alabaster Cream", hex: "#EAE4D8", image: "assets/images/products/hoodie_cream_female.jpg" }
    ],
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    primaryImage: "assets/images/products/hoodie_charcoal.jpg",
    secondaryImage: "assets/images/products/hoodie_zip_black.jpg",
    description: "Constructed with 450GSM custom loopback French terry. Features double-layered structured hood, kangaroo pocket, ribbed cuffs, and iconic embroidered chest emblem.",
    details: [
      "450 GSM Heavyweight Loopback French Terry",
      "Double-lined hood without drawstrings for minimal profile",
      "Drop-shoulder unisex tailoring",
      "Discreet embroidered 'Z' monogram",
      "Ribbed side gussets for maximum mobility"
    ],
    isFeatured: true,
    isNew: false
  },
  {
    id: "zarona-shirt-01",
    name: "Linen Shirt",
    category: "Shirts",
    price: 42.00,
    originalPrice: 50.00,
    badge: null,
    rating: 4.8,
    reviewsCount: 89,
    colors: [
      { name: "Sand Ecru", hex: "#D6CCA9", image: "assets/images/products/shirt_linen_sand.jpg" },
      { name: "Warm Taupe", hex: "#B8A78F", image: "assets/images/products/shirt_linen_sand.jpg" },
      { name: "Charcoal Noir", hex: "#222222", image: "assets/images/products/longsleeve_black.jpg" }
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    primaryImage: "assets/images/products/shirt_linen_sand.jpg",
    secondaryImage: "assets/images/products/shirt_linen_sand.jpg",
    description: "Crafted from 100% breathable European washed flax linen. Relaxed camp-collar profile designed for fluid drape and effortless unisex elegance.",
    details: [
      "100% Premium European Washed Linen",
      "Naturally thermoregulating and breathable",
      "Camp collar with genuine horn-effect buttons",
      "Single chest patch pocket",
      "Gentle curved hem for tucked or untucked styling"
    ],
    isFeatured: true,
    isNew: false
  },
  {
    id: "zarona-pants-01",
    name: "Relaxed Fit Pants",
    category: "Pants",
    price: 45.00,
    originalPrice: null,
    badge: "Popular",
    rating: 4.9,
    reviewsCount: 96,
    colors: [
      { name: "Charcoal Grey", hex: "#3D3D3C", image: "assets/images/products/pants_relaxed.jpg" },
      { name: "Olive Khaki", hex: "#555246", image: "assets/images/products/pants_relaxed.jpg" },
      { name: "Stone Tan", hex: "#BCB3A4", image: "assets/images/products/pants_relaxed.jpg" }
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    primaryImage: "assets/images/products/pants_relaxed.jpg",
    secondaryImage: "assets/images/products/pants_relaxed.jpg",
    description: "Tailored with a generous wide-leg drape, single pleat accents, elasticated waistband with internal drawcord, and deep welt pockets.",
    details: [
      "Cotton-Tencel blend with soft fluid movement",
      "Mid-rise with relaxed straight-to-wide leg",
      "Single front pleats for editorial structure",
      "Hidden drawstring waistband for adaptable unisex fit",
      "Deep side slash pockets and rear welt pocket"
    ],
    isFeatured: true,
    isNew: false
  },
  {
    id: "zarona-varsity-01",
    name: "Varsity Sweatshirt",
    category: "Sweatshirts",
    price: 52.00,
    originalPrice: 65.00,
    badge: "New Arrival",
    rating: 4.9,
    reviewsCount: 174,
    colors: [
      { name: "Forest Green", hex: "#233329", image: "assets/images/products/varsity_green.jpg" },
      { name: "Washed Stone", hex: "#9E9A90", image: "assets/images/products/varsity_green_back.jpg" }
    ],
    sizes: ["S", "M", "L", "XL", "XXL"],
    primaryImage: "assets/images/products/varsity_green.jpg",
    secondaryImage: "assets/images/products/varsity_green_back.jpg",
    description: "Heritage athletic crewneck in dense brushed fleece featuring archival felt appliqué Zarona Unisex typography and ribbed trims.",
    details: [
      "400 GSM Ultra-Soft Brushed Interior Fleece",
      "Stitched varsity lettermark and back typography",
      "Thick 2x2 ribbed collar, hem, and cuffs",
      "Drop shoulder boxy silhouette",
      "Vintage garment dyed finish"
    ],
    isFeatured: true,
    isNew: true
  },
  {
    id: "zarona-corduroy-01",
    name: "Corduroy Jacket",
    category: "Jackets",
    price: 68.00,
    originalPrice: 85.00,
    badge: "Trending",
    rating: 5.0,
    reviewsCount: 64,
    colors: [
      { name: "Caramel Brown", hex: "#6E452B", image: "assets/images/products/jacket_corduroy_brown.jpg" },
      { name: "Noir Black", hex: "#222222", image: "assets/images/products/jacket_corduroy_female.jpg" }
    ],
    sizes: ["S", "M", "L", "XL"],
    primaryImage: "assets/images/products/jacket_corduroy_brown.jpg",
    secondaryImage: "assets/images/products/jacket_corduroy_female.jpg",
    description: "Vintage-inspired 8-wale corduroy chore jacket with antique brass dual-zip hardware, reinforced chest pockets, and relaxed dropped shoulders.",
    details: [
      "100% Heavy Cotton 8-Wale Corduroy",
      "Custom dual-direction antique brass zipper",
      "Quilted cupro lining for smooth layering",
      "Dual front chore pockets and hidden inner pocket",
      "Relaxed unisex overshirt cut"
    ],
    isFeatured: true,
    isNew: true
  },
  {
    id: "zarona-knit-01",
    name: "Tactile Rib Knit Crewneck",
    category: "Sweatshirts",
    price: 58.00,
    originalPrice: null,
    badge: null,
    rating: 4.9,
    reviewsCount: 82,
    colors: [
      { name: "Alabaster Cream", hex: "#E9E3D5", image: "assets/images/products/knit_cream_female.jpg" },
      { name: "Dark Chocolate", hex: "#3A2B23", image: "assets/images/products/knit_chocolate.jpg" }
    ],
    sizes: ["XS", "S", "M", "L", "XL"],
    primaryImage: "assets/images/products/knit_cream_female.jpg",
    secondaryImage: "assets/images/products/knit_chocolate.jpg",
    description: "Heavyweight tactile rib-knit spun from soft wool-cotton blend. Relaxed silhouette with exaggerated cuffs and crewneck collar.",
    details: [
      "70% Organic Cotton, 30% Merino Wool",
      "Sculptural chunkier rib knit gauge",
      "Embroidered tonal 'Z' monogram on chest",
      "Subtle side split hem for easy layering"
    ],
    isFeatured: false,
    isNew: true
  },
  {
    id: "zarona-cap-01",
    name: "Structured 'Z' Monogram Cap",
    category: "Accessories",
    price: 26.00,
    originalPrice: null,
    badge: "Essential",
    rating: 4.8,
    reviewsCount: 115,
    colors: [
      { name: "Noir Black", hex: "#151515", image: "assets/images/products/cap_black.jpg" }
    ],
    sizes: ["One Size"],
    primaryImage: "assets/images/products/cap_black.jpg",
    secondaryImage: "assets/images/products/cap_black.jpg",
    description: "Unstructured 6-panel silhouette in 100% washed cotton twill with low-profile crown and tonal embroidered 'Z' emblem.",
    details: [
      "100% Washed Cotton Twill",
      "Low profile 6-panel construction",
      "Embroidered 'Z' front logo",
      "Adjustable strap with brass buckle clasp",
      "Curved brim with tonal stitching"
    ],
    isFeatured: false,
    isNew: false
  }
];
