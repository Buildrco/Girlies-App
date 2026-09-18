import AsyncStorage from '@react-native-async-storage/async-storage';
import { MARKETPLACE_CATEGORIES } from '../constants/categories';

export type StorefrontConfig = { categories: string[]; bannerUrl: string; showServices: boolean };
export const storefrontCategories = MARKETPLACE_CATEGORIES.map(category => category.label);
export const storefrontCategoryImages: Record<string, string> = Object.fromEntries(MARKETPLACE_CATEGORIES.map(category => [category.label, category.image]));
const keyFor = (storeId: string) => `girlies:storefront:${storeId}`;
export async function getStorefrontConfig(storeId: string): Promise<StorefrontConfig> {
  const fallback: StorefrontConfig = { categories: [], bannerUrl: '', showServices: true };
  if (!storeId) return fallback;
  const value = await AsyncStorage.getItem(keyFor(storeId));
  if (!value) return fallback;
  try { return { ...fallback, ...JSON.parse(value) }; } catch { return fallback; }
}
export async function saveStorefrontConfig(storeId: string, config: StorefrontConfig) { if (storeId) await AsyncStorage.setItem(keyFor(storeId), JSON.stringify(config)); }