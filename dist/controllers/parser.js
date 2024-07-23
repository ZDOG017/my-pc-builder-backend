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
exports.fetchProduct = fetchProduct;
exports.parseComponentFromKaspiKz = parseComponentFromKaspiKz;
const puppeteer_1 = __importDefault(require("puppeteer"));
const string_similarity_1 = __importDefault(require("string-similarity"));
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function parseComponentFromKaspiKz(searchTerm) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log(`Launching browser for search term: ${searchTerm}`);
        const browser = yield puppeteer_1.default.launch({
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
        const page = yield browser.newPage();
        console.log('New page created.');
        try {
            yield page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            console.log('User agent set.');
            const delayTime = Math.floor(Math.random() * 3000) + 1000;
            yield delay(delayTime);
            console.log(`Delay of ${delayTime} ms`);
            const encodedName = encodeURIComponent(searchTerm);
            const url = `https://kaspi.kz/shop/search/?text=${encodedName}&hint_chips_click=false`;
            console.log(`Fetching Kaspi.kz search URL: ${url}`);
            yield page.goto(url, { waitUntil: ['load'], timeout: 60000 });
            console.log('Page loaded.');
            const products = yield page.evaluate(() => {
                console.log('Evaluating products on the page...');
                const productElements = document.querySelectorAll('.item-card');
                const products = [];
                productElements.forEach((element, index) => {
                    var _a, _b, _c;
                    if (index >= 3)
                        return; // Limit to 3 matching products
                    const nameElement = element.querySelector('.item-card__name-link');
                    const priceElement = element.querySelector('.item-card__prices-price');
                    const imageElement = element.querySelector('.item-card__image');
                    const ratingElement = element.querySelector('.rating');
                    const reviewCountElement = element.querySelector('.item-card__rating a');
                    if (nameElement && priceElement && imageElement) {
                        const name = ((_a = nameElement.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || '';
                        const priceText = ((_b = priceElement.textContent) === null || _b === void 0 ? void 0 : _b.trim().replace(/[^\d]/g, '')) || '0';
                        const price = parseFloat(priceText) || 0;
                        const url = nameElement.getAttribute('href') || '';
                        const image = imageElement.src || '';
                        const ratingClass = (ratingElement === null || ratingElement === void 0 ? void 0 : ratingElement.getAttribute('class')) || '';
                        const ratingMatch = ratingClass.match(/\*(\d+)/);
                        const rating = ratingMatch ? (parseInt(ratingMatch[1]) / 10).toFixed(1) : '0.0';
                        const reviewCountText = ((_c = reviewCountElement === null || reviewCountElement === void 0 ? void 0 : reviewCountElement.textContent) === null || _c === void 0 ? void 0 : _c.trim()) || '';
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
        }
        catch (error) {
            if (error instanceof Error) {
                console.error(`Error fetching URL for ${searchTerm} from Kaspi.kz. Error: ${error.message}`);
            }
            return [];
        }
        finally {
            yield browser.close();
            console.log('Browser closed.');
        }
    });
}
function findBestMatch(searchTerm, products) {
    if (products.length === 0)
        return null;
    const productNames = products.map(product => product.name);
    const { bestMatch } = string_similarity_1.default.findBestMatch(searchTerm, productNames);
    const bestMatchIndex = productNames.indexOf(bestMatch.target);
    return products[bestMatchIndex] || null;
}
// Export the fetchProduct function and ensure no redeclaration of parseComponentFromKaspiKz
function fetchProduct(searchTerm) {
    return __awaiter(this, void 0, void 0, function* () {
        const products = yield parseComponentFromKaspiKz(searchTerm);
        const bestMatch = findBestMatch(searchTerm, products);
        return bestMatch;
    });
}
//is it all computer components
