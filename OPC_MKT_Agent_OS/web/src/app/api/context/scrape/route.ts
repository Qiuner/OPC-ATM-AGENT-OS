import { NextRequest, NextResponse } from 'next/server';
import { createContextAsset } from '@/lib/store/context-assets';

/** Scraped product data structure */
interface ScrapedProduct {
  name: string;
  description: string;
  price: string | null;
  image: string | null;
  features: string[];
  url: string;
}

/**
 * POST /api/context/scrape
 * Accepts a URL, fetches the page, extracts product info,
 * and saves it as a context asset (type='product').
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body as { url?: string };

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing required field: url' },
        { status: 400 }
      );
    }

    // Validate URL
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format. Please provide a valid http/https URL.' },
        { status: 400 }
      );
    }

    // Fetch the page
    let html: string;
    try {
      const res = await fetch(parsedUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OPC-MKT-Agent/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        return NextResponse.json(
          { success: false, error: `Failed to fetch URL: HTTP ${res.status}` },
          { status: 502 }
        );
      }

      html = await res.text();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error';
      return NextResponse.json(
        { success: false, error: `Failed to fetch URL: ${message}` },
        { status: 502 }
      );
    }

    // Extract product data from HTML
    const product = extractProductData(html, parsedUrl.toString());

    // Save as context asset
    const asset = await createContextAsset({
      workspace_id: 'ws-001',
      type: 'product',
      title: product.name || parsedUrl.hostname,
      content: buildProductContent(product),
      metadata: {
        source_url: url,
        scraped_at: new Date().toISOString(),
        product_name: product.name,
        product_price: product.price,
        product_image: product.image,
        product_features: product.features,
        product_description: product.description,
        status: 'complete',
      },
      created_by: 'scraper',
    });

    return NextResponse.json({
      success: true,
      data: asset,
      product,
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * Extract product information from HTML using meta tags and common patterns.
 * No external dependencies needed — works with standard HTML parsing.
 */
function extractProductData(html: string, url: string): ScrapedProduct {
  const product: ScrapedProduct = {
    name: '',
    description: '',
    price: null,
    image: null,
    features: [],
    url,
  };

  // --- Name extraction (priority order) ---
  // 1. og:title
  product.name = extractMeta(html, 'og:title')
    // 2. twitter:title
    || extractMeta(html, 'twitter:title')
    // 3. <title> tag
    || extractTag(html, 'title')
    // 4. First h1
    || extractTag(html, 'h1')
    || '';

  // --- Description extraction ---
  product.description = extractMeta(html, 'og:description')
    || extractMeta(html, 'description')
    || extractMeta(html, 'twitter:description')
    || '';

  // --- Price extraction ---
  // Look for JSON-LD Product schema first
  const jsonLdPrice = extractJsonLdPrice(html);
  if (jsonLdPrice) {
    product.price = jsonLdPrice;
  } else {
    // Fallback: look for price patterns in meta or body
    const priceMatch = html.match(/["']?price["']?\s*[:=]\s*["']?\$?([\d,.]+)/i)
      || html.match(/\$\s*([\d,.]+)/);
    if (priceMatch) {
      product.price = `$${priceMatch[1]}`;
    }
  }

  // --- Image extraction ---
  product.image = extractMeta(html, 'og:image')
    || extractMeta(html, 'twitter:image')
    || extractMetaProperty(html, 'image')
    || null;

  // Resolve relative image URLs
  if (product.image && !product.image.startsWith('http')) {
    try {
      product.image = new URL(product.image, url).toString();
    } catch {
      // Keep as-is if URL resolution fails
    }
  }

  // --- Features extraction ---
  // Look for list items in common feature sections
  const featureMatches = html.match(/<li[^>]*>([^<]{10,200})<\/li>/gi);
  if (featureMatches) {
    product.features = featureMatches
      .slice(0, 8)
      .map((li) => li.replace(/<[^>]+>/g, '').trim())
      .filter((text) => text.length > 5 && text.length < 200);
  }

  return product;
}

/** Extract content from <meta property="..." content="..."> or <meta name="..." content="..."> */
function extractMeta(html: string, name: string): string {
  // property variant (OpenGraph)
  const propMatch = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["'](?:og:)?${escapeRegex(name)}["'][^>]+content=["']([^"']+)["']`, 'i')
  );
  if (propMatch) return decodeHTMLEntities(propMatch[1]);

  // Reversed order (content before property)
  const reversedMatch = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:)?${escapeRegex(name)}["']`, 'i')
  );
  if (reversedMatch) return decodeHTMLEntities(reversedMatch[1]);

  return '';
}

/** Extract content from <meta property="..." content="..."> (property only) */
function extractMetaProperty(html: string, property: string): string {
  const match = html.match(
    new RegExp(`<meta[^>]+property=["']${escapeRegex(property)}["'][^>]+content=["']([^"']+)["']`, 'i')
  );
  return match ? decodeHTMLEntities(match[1]) : '';
}

/** Extract inner text of the first occurrence of a tag */
function extractTag(html: string, tag: string): string {
  const match = html.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i'));
  return match ? decodeHTMLEntities(match[1].trim()) : '';
}

/** Extract price from JSON-LD structured data */
function extractJsonLdPrice(html: string): string | null {
  const jsonLdMatches = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  if (!jsonLdMatches) return null;

  for (const block of jsonLdMatches) {
    const jsonStr = block.replace(/<[^>]+>/g, '');
    try {
      const data = JSON.parse(jsonStr) as Record<string, unknown>;
      // Direct Product type
      if (data['@type'] === 'Product') {
        const offers = data.offers as Record<string, unknown> | undefined;
        if (offers) {
          const price = offers.price ?? (offers as Record<string, unknown>).lowPrice;
          const currency = (offers.priceCurrency as string) || 'USD';
          if (price !== undefined) {
            return currency === 'USD' ? `$${price}` : `${price} ${currency}`;
          }
        }
      }
    } catch {
      // Skip invalid JSON-LD
    }
  }
  return null;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeHTMLEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

/** Build a readable text summary of the product for the content field */
function buildProductContent(product: ScrapedProduct): string {
  const parts: string[] = [];

  if (product.name) parts.push(`Product: ${product.name}`);
  if (product.price) parts.push(`Price: ${product.price}`);
  if (product.description) parts.push(`\n${product.description}`);
  if (product.features.length > 0) {
    parts.push(`\nKey Features:\n${product.features.map((f) => `- ${f}`).join('\n')}`);
  }
  parts.push(`\nSource: ${product.url}`);

  return parts.join('\n');
}
