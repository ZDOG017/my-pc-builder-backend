import { Request, Response } from "express";
import OpenAI from "openai";
import dotenv from "dotenv";
import { fetchProduct } from './parser';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatCompletionMessageParam {
  role: 'user' | 'assistant' | 'system';
  content: string;
  name?: string;
}

interface Product {
  name: string;
  price: number;
  url: string;
  image: string;
  rating: string;
  reviewCount: number;
}

export const generateResponse = async (req: Request, res: Response) => {
  try {
    const { prompt, budget } = req.body;
    console.log('Received prompt:', prompt);
    console.log('Budget:', budget);

    const modelId = "gpt-4o";
    const systemPrompt = `You are an assistant helping to build PCs with a focus on speed, affordability, and reliability.
    Make a research on the prices of the components and components themselves in Kazakhstan.
    Look up the prices strictly in KZT.
    Suggest components that are commonly available and offer good value for money.
    Prefer newer, widely available models over older or niche products.
    IMPORTANT: Make a build that accurately or closely matches the desired budget of the user and DON'T comment on this. IMPORTANT: take the real-time prices of the components from kaspi.kz. 
    IMPORTANT: Dont write anything except JSON Format. STRICTLY list only the component names in JSON format, with each component type as a key and the component name as the value. DO NOT WRITE ANYTHING EXCEPT THE JSON. The response must include exactly these components: CPU, GPU, Motherboard, RAM, PSU, CPU Cooler, FAN, PC case. Use components that are most popular in Kazakhstan's stores in July 2024. Before answering, check the prices today in Kazakhstan.
    IMPORTANT: please dont send '''json {code} '''
    IMPORTANT: Please choose pricier gpu and cpu. Main budget should be focused on GPU.
    Example of the response:
    {
      "CPU": "AMD Ryzen 5 3600",
      "GPU": "Gigabyte GeForce GTX 1660 SUPER OC",
      "Motherboard": "Asus PRIME B450M-K",
      "RAM": "Corsair Vengeance LPX 16GB",
      "PSU": "EVGA 600 W1",
      "CPU Cooler": "Cooler Master Hyper 212",
      "FAN": "Noctua NF-P12",
      "PC case": "NZXT H510"
    }`;

    const currentMessages: ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: `${prompt} The budget for this build is ${budget} KZT.` }
    ];

    console.log('Sending messages to OpenAI:', currentMessages);

    const result = await openai.chat.completions.create({
      model: modelId,
      messages: currentMessages,
    });

    const responseText = result.choices[0].message?.content || '';
    console.log('Received response from OpenAI: \n', responseText);

    let components;
    try {
      components = JSON.parse(responseText);
    } catch (error) {
      throw new Error('Failed to parse JSON response from OpenAI');
    }

    const requiredComponents = ["CPU", "GPU", "Motherboard", "RAM", "PSU", "CPU Cooler", "FAN", "PC case"];
    const componentKeys = Object.keys(components);

    if (!requiredComponents.every(comp => componentKeys.includes(comp))) {
      throw new Error('OpenAI response is missing one or more required components');
    }

    const fetchedProducts = await Promise.all(
      requiredComponents.map(async (key) => {
        const component = components[key];
        try {
          console.log(`Fetching products for component: ${component}`);
          const bestMatchProduct = await fetchProduct(component);
          console.log(`Best match product for ${component}:`, bestMatchProduct);
          return { key, product: bestMatchProduct };
        } catch (err) {
          console.error('Error fetching product:', component, err);
          return { key, product: null };
        }
      })
    );

    const availableProducts = fetchedProducts.filter(({ product }) => product !== null);
    console.log('Available products after filtering:', availableProducts.length);

    const missingComponents = fetchedProducts
      .filter(({ product }) => product === null)
      .map(({ key }) => key);

    let productResponse = availableProducts.reduce((acc, { key, product }) => {
      if (product) {
        acc[key] = product;
      }
      return acc;
    }, {} as Record<string, Product>);

    // Calculate total price
    const totalPrice = Object.values(productResponse).reduce((sum, product) => sum + product.price, 0);

    // If there are missing components or the total price is not within 10% of the budget, ask OpenAI for adjustments
    if (missingComponents.length > 0 || Math.abs(totalPrice - budget) / budget > 0.1) {
      const componentsWithPrices = Object.entries(productResponse)
        .map(([key, product]) => `${key}: ${product.name} - ${product.price} KZT`)
        .join(', ');

      const adjustmentPrompt = `The following components were not found or the total price (${totalPrice} KZT) is not within 10% of the budget (${budget} KZT):
      ${missingComponents.join(', ')}. Current components and prices: ${componentsWithPrices}.
      Please suggest alternatives for the missing components and adjust the build to be closer to the budget while maintaining performance. STRICTLY: Provide your response in the same JSON format as before. Ensure the total cost does not exceed the budget and remains within 10% of the budget.
      And Also Please ensure that all components are real pc components because before parser could give me freezer or something random`;

      const adjustmentMessages: ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "user", content: adjustmentPrompt }
      ];

      const adjustmentResult = await openai.chat.completions.create({
        model: modelId,
        messages: adjustmentMessages,
      });

      const adjustedResponseText = adjustmentResult.choices[0].message?.content || '';
      console.log('Received adjusted response from OpenAI: \n', adjustedResponseText);

      try {
        const adjustedComponents = JSON.parse(adjustedResponseText);
        
        // Fetch products for adjusted components
        const adjustedFetchedProducts = await Promise.all(
          Object.entries(adjustedComponents).map(async ([key, component]) => {
            if (typeof component === 'string') {
              try {
                console.log(`Fetching products for adjusted component: ${component}`);
                const bestMatchProduct = await fetchProduct(component);
                console.log(`Best match product for adjusted ${component}:`, bestMatchProduct);
                return { key, product: bestMatchProduct };
              } catch (err) {
                console.error('Error fetching adjusted product:', component, err);
                return { key, product: null };
              }
            }
            return { key, product: null };
          })
        );

        // Merge adjusted products with original products
        adjustedFetchedProducts.forEach(({ key, product }) => {
          if (product) {
            productResponse[key] = product;
          }
        });
      } catch (error) {
        console.error('Failed to parse adjusted JSON response from OpenAI:', error);
      }
    }

    // Send the response and return immediately
    res.send({ response: responseText, products: productResponse });
    return; // This ensures that the function stops executing after sending the response

  } catch (err) {
    console.error('Error in generateResponse:', err);
    res.status(500).json({ message: "Internal server error" });
    return; // Also return here to ensure the function stops in case of an error
  }
};
