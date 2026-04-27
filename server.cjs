const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const cheerio = require('cheerio');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/scrape', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url param required' });

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      timeout: 10000,
    });

    if (!response.ok) {
      return res.status(502).json({ error: `Upstream returned ${response.status}` });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Try OG tags first, then fallbacks
    const getMetaContent = (selectors) => {
      for (const sel of selectors) {
        const val = $(sel).attr('content');
        if (val && val.trim()) return val.trim();
      }
      return null;
    };

    const title =
      getMetaContent(['meta[property="og:title"]', 'meta[name="twitter:title"]']) ||
      $('title').text().trim() ||
      null;

    const image =
      getMetaContent(['meta[property="og:image"]', 'meta[name="twitter:image"]', 'meta[name="twitter:image:src"]']) ||
      null;

    const description =
      getMetaContent(['meta[property="og:description"]', 'meta[name="description"]', 'meta[name="twitter:description"]']) ||
      null;

    const priceRaw =
      getMetaContent(['meta[property="product:price:amount"]', 'meta[property="og:price:amount"]', 'meta[name="price"]']) ||
      null;

    const price = priceRaw ? parseFloat(priceRaw) : null;

    const siteName =
      getMetaContent(['meta[property="og:site_name"]']) ||
      new URL(url).hostname.replace('www.', '').split('.')[0] ||
      null;

    res.json({ title, image, description, price, siteName, url });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3456;
app.listen(PORT, () => console.log(`FitCheck scraper proxy running on http://localhost:${PORT}`));
