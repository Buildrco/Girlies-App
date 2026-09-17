export type CategoryDefinition = {
  slug: string;
  label: string;
  subtitle: string;
  icon: string;
  color: string;
  image: string;
  subcategories: string[];
};

export const MARKETPLACE_CATEGORIES: CategoryDefinition[] = [
  {
    slug: 'hair',
    label: 'Hair',
    subtitle: 'Wigs, braids & bundles',
    icon: 'hair',
    color: '#FFB7C9',
    image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1000&q=85',
    subcategories: ['Wigs', 'Bundles', 'Braids', 'Closures', 'Hair care'],
  },
  {
    slug: 'beauty',
    label: 'Beauty',
    subtitle: 'Makeup, skincare & glow',
    icon: 'beauty',
    color: '#FFD45A',
    image: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1000&q=85',
    subcategories: ['Makeup', 'Skincare', 'Body care', 'Tools', 'Nails'],
  },
  {
    slug: 'fashion',
    label: 'Fashion',
    subtitle: 'Looks for every plan',
    icon: 'fashion',
    color: '#B89CFF',
    image: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1000&q=85',
    subcategories: ['Dresses', 'Tops', 'Shoes', 'Bags', 'Jewellery'],
  },
  {
    slug: 'fragrance',
    label: 'Fragrance',
    subtitle: 'Scents that stay',
    icon: 'fragrance',
    color: '#8EDBC2',
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1000&q=85',
    subcategories: ['Perfume', 'Body mist', 'Oils', 'Gift sets', 'Home scent'],
  },
  {
    slug: 'gadgets',
    label: 'Gadgets',
    subtitle: 'Phones, tech & accessories',
    icon: 'gadgets',
    color: '#A7DDF2',
    image: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1000&q=85',
    subcategories: ['Phones', 'Audio', 'Smart watches', 'Gaming', 'Accessories'],
  },
  {
    slug: 'home-appliances',
    label: 'Home appliances',
    subtitle: 'Useful things for home',
    icon: 'appliances',
    color: '#CBEA9C',
    image: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1000&q=85',
    subcategories: ['Kitchen', 'Cleaning', 'Cooling', 'Small appliances', 'Electronics'],
  },
  {
    slug: 'furniture',
    label: 'Furniture',
    subtitle: 'Pieces with personality',
    icon: 'furniture',
    color: '#F4B49F',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1000&q=85',
    subcategories: ['Living room', 'Bedroom', 'Dining', 'Office', 'Decor'],
  },
  {
    slug: 'intimates',
    label: 'Intimates',
    subtitle: 'Private care & pleasure',
    icon: 'intimates',
    color: '#F6A7D4',
    image: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?auto=format&fit=crop&w=1000&q=85',
    subcategories: ['Lingerie', 'Wellness', 'Body care', 'Accessories', 'Gift sets'],
  },
];

export function getCategory(slug: string) {
  return MARKETPLACE_CATEGORIES.find(category => category.slug === slug) || MARKETPLACE_CATEGORIES[0];
}