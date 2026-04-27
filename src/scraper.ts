export interface ScrapedProduct {
  title: string | null;
  image: string | null;
  description: string | null;
  price: number | null;
  siteName: string | null;
  url: string;
}

export async function scrapeProduct(url: string): Promise<ScrapedProduct> {
  const res = await fetch(`/api/scrape?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Failed to fetch ${url}`);
  }
  return res.json();
}
