import AsyncStorage from '@react-native-async-storage/async-storage';

export type StorefrontConfig = {
  categories: string[];
  bannerUrl: string;
  showServices: boolean;
};

export const storefrontCategories = ['Hair', 'Beauty', 'Fashion', 'Fragrance', 'Bags', 'Jewellery', 'Shoes', 'Home'];

export const storefrontCategoryImages: Record<string, string> = {
  Hair: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=85',
  Beauty: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=85',
  Fashion: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=85',
  Fragrance: 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=85',
  Bags: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=85',
  Jewellery: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=85',
  Shoes: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=85',
  Home: 'https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=85',
};

const keyFor = (storeId: string) => `girlies:storefront:${storeId}`;

export async function getStorefrontConfig(storeId: string): Promise<StorefrontConfig> {
  const fallback: StorefrontConfig = { categories: [], bannerUrl: '', showServices: true };
  if (!storeId) return fallback;
  const value = await AsyncStorage.getItem(keyFor(storeId));
  if (!value) return fallback;
  try {
    return { ...fallback, ...JSON.parse(value) };
  } catch {
    return fallback;
  }
}

export async function saveStorefrontConfig(storeId: string, config: StorefrontConfig) {
  if (!storeId) return;
  await AsyncStorage.setItem(keyFor(storeId), JSON.stringify(config));
}