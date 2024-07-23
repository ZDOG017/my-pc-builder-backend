"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/parseAlfa.ts
const axios_1 = __importDefault(require("axios"));
const cheerio_1 = __importDefault(require("cheerio"));
const database_1 = require("../config/database");
const Component_1 = __importDefault(require("../models/Component"));
function parseAlfa(category, type) {
    return __awaiter(this, void 0, void 0, function* () {
        let currentPage = 0;
        const maxPages = 5; // Максимальное количество страниц для парсинга
        let hasNextPage = true;
        while (hasNextPage && currentPage < maxPages) {
            const url = `https://alfa.kz/parts/${category}/page${currentPage}#products`;
            console.log(`Fetching URL: ${url}`);
            const response = yield axios_1.default.get(url);
            const $ = cheerio_1.default.load(response.data);
            const items = [];
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
                }
                else {
                    console.log('Item missing data:', { name, price, productUrl, image });
                }
            });
            for (const item of items) {
                yield Component_1.default.findOneAndUpdate({ name: item.name, store: 'alfa.kz' }, {
                    name: item.name,
                    type,
                    price: item.price,
                    store: 'alfa.kz',
                    url: item.url,
                    image: item.image,
                    lastUpdated: new Date()
                }, { upsert: true, new: true });
                console.log(`Saved: ${item.name} - ${item.price} KZT`);
            }
            // Проверка на наличие следующей страницы
            const nextPageElement = $('li.page-item.last a.page-link'); // Селектор для элемента "следующая страница"
            hasNextPage = nextPageElement.length > 0;
            currentPage++;
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield (0, database_1.connectDB)();
        yield parseAlfa('cpu', 'CPU');
        // Добавьте другие категории по необходимости
        console.log('Parsing completed');
        process.exit(0);
    });
}
main().catch(console.error);
