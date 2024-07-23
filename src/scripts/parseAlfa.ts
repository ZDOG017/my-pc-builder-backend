// scripts/parseAlfa.ts
import axios from 'axios';
import cheerio from 'cheerio';
import { connectDB } from '../config/database';
import Component from '../models/Component';

async function parseAlfa(category: string, type: string) {
  let currentPage = 0;
  const maxPages = 5; // Максимальное количество страниц для парсинга
  let hasNextPage = true;

  while (hasNextPage && currentPage < maxPages) {
    const url = `https://alfa.kz/parts/${category}/page${currentPage}#products`;
    console.log(`Fetching URL: ${url}`);
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const items: Array<{ name: string; price: number; url: string; image: string }> = [];

    $('.col-12.col-sm-3.image-holder').each((_, element) => {
      const productElement = $(element).next('.col-12.col-sm-9.body-holder');

      const name = productElement.find('h2 a span[itemprop="name"]').text().trim();
      const priceText = productElement.find('.price-container meta[itemprop="price"]').attr('content');
      const price = parseFloat(priceText || '0');
      const productUrl = productElement.find('h2 a').attr('href');
      const image = $(element).find('img').attr('src');

      if (name && price && productUrl && image) {
        items.push({ name, price, url: `https://alfa.kz${productUrl}`, image });
        console.log(`Found item: ${name}, Price: ${price}, URL: ${productUrl}, Image: ${image}`);
      } else {
        console.log('Item missing data:', { name, price, productUrl, image });
      }
    });

    for (const item of items) {
      await Component.findOneAndUpdate(
        { name: item.name, store: 'alfa.kz' },
        {
          name: item.name,
          type,
          price: item.price,
          store: 'alfa.kz',
          url: item.url,
          image: item.image,
          lastUpdated: new Date()
        },
        { upsert: true, new: true }
      );
      console.log(`Saved: ${item.name} - ${item.price} KZT`);
    }

    // Проверка на наличие следующей страницы
    const nextPageElement = $('li.page-item.last a.page-link'); // Селектор для элемента "следующая страница"
    hasNextPage = nextPageElement.length > 0;
    currentPage++;
  }
}

async function main() {
  await connectDB();
  await parseAlfa('cpu', 'CPU');
  // Добавьте другие категории по необходимости
  console.log('Parsing completed');
  process.exit(0);
}

main().catch(console.error);
