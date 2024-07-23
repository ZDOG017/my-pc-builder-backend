import puppeteer from 'puppeteer';
import stringSimilarity from 'string-similarity';

interface Product {
  name: string;
  price: number;
  url: string;
  image: string;
  rating: string;
  reviewCount: number;
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function parseComponentFromKaspiKz(searchTerm: string): Promise<Product[]> {
  console.log(`Launching browser for search term: ${searchTerm}`);

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-infobars',
      '--window-position=0,0',
      '--ignore-certificate-errors',
      '--ignore-certificate-errors-spki-list',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      '--disable-dev-shm-usage',
      '--single-process',
      '--disable-gpu',
      '--no-zygote',
    ],
    ignoreDefaultArgs: ['--disable-extensions'],
    timeout: 120000
  });

  console.log('Browser launched.');

  const page = await browser.newPage();
  console.log('New page created.');

  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    console.log('User agent set.');

    const delayTime = Math.floor(Math.random() * 3000) + 1000;
    await delay(delayTime);
    console.log(`Delay of ${delayTime} ms`);

    const encodedName = encodeURIComponent(searchTerm);
    const url = `https://kaspi.kz/shop/search/?text=${encodedName}&hint_chips_click=false`;
    console.log(`Fetching Kaspi.kz search URL: ${url}`);

    await page.goto(url, { waitUntil: ['load'], timeout: 60000});
    console.log('Page loaded.');

    const products = await page.evaluate(() => {
      console.log('Evaluating products on the page...');
      const productElements = document.querySelectorAll('.item-card');
      const products: Product[] = []; 

      productElements.forEach((element, index) => {
        if (index >= 3) return; // Limit to 3 matching products

        const nameElement = element.querySelector('.item-card__name-link');
        const priceElement = element.querySelector('.item-card__prices-price');
        const imageElement = element.querySelector('.item-card__image') as HTMLImageElement;
        const ratingElement = element.querySelector('.rating');
        const reviewCountElement = element.querySelector('.item-card__rating a');

        if (nameElement && priceElement && imageElement) {
          const name = nameElement.textContent?.trim() || '';
          const priceText = priceElement.textContent?.trim().replace(/[^\d]/g, '') || '0';
          const price = parseFloat(priceText) || 0;
          const url = nameElement.getAttribute('href') || '';
          const image = imageElement.src || '';

          const ratingClass = ratingElement?.getAttribute('class') || '';
          const ratingMatch = ratingClass.match(/\*(\d+)/);
          const rating = ratingMatch ? (parseInt(ratingMatch[1]) / 10).toFixed(1) : '0.0';

          const reviewCountText = reviewCountElement?.textContent?.trim() || '';
          const reviewCountMatch = reviewCountText.match(/\d+/);
          const reviewCount = reviewCountMatch ? parseInt(reviewCountMatch[0]) : 0;

          products.push({
            name,
            price,
            url,
            image,
            rating,
            reviewCount
          });
        }
      });

      console.log('Products evaluated.');
      return products;
    });

    console.log(`Found ${products.length} products for search term: ${searchTerm}`);
    return products;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error fetching URL for ${searchTerm} from Kaspi.kz. Error: ${error.message}`);
    }
    return [];
  } finally {
    await browser.close();
    console.log('Browser closed.');
  }
}

function findBestMatch(searchTerm: string, products: Product[]): Product | null {
  if (products.length === 0) return null;

  const productNames = products.map(product => product.name);
  const { bestMatch } = stringSimilarity.findBestMatch(searchTerm, productNames);

  const bestMatchIndex = productNames.indexOf(bestMatch.target);
  return products[bestMatchIndex] || null;
}

// Export the fetchProduct function and ensure no redeclaration of parseComponentFromKaspiKz
export async function fetchProduct(searchTerm: string) {
  const products = await parseComponentFromKaspiKz(searchTerm);
  const bestMatch = findBestMatch(searchTerm, products);
  return bestMatch;
}

export { parseComponentFromKaspiKz };


//is it all computer components