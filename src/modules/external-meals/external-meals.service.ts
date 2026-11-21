type Meal = Record<string, unknown>;

interface CacheEntry {
  expiresAt: number;
  value: unknown;
}

export interface MealSearchFilters {
  query?: string;
  category?: string;
  area?: string;
  ingredient?: string;
}

const CACHE_DURATION = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 256;
const MAX_TRANSLATED_TEXT_ENTRIES = 512;
const cache = new Map<string, CacheEntry>();
const translatedTextCache = new Map<string, CacheEntry>();

const categoryTranslations: Record<string, string> = {
  Beef: "Bœuf",
  Breakfast: "Petit-déjeuner",
  Chicken: "Poulet",
  Dessert: "Dessert",
  Goat: "Chèvre",
  Lamb: "Agneau",
  Miscellaneous: "Divers",
  Pasta: "Pâtes",
  Pork: "Porc",
  Seafood: "Fruits de mer",
  Side: "Accompagnement",
  Starter: "Entrée",
  Vegan: "Végétalien",
  Vegetarian: "Végétarien",
};

const areaTranslations: Record<string, string> = {
  American: "Américain",
  British: "Britannique",
  Canadian: "Canadien",
  Chinese: "Chinois",
  Croatian: "Croate",
  Dutch: "Néerlandais",
  Egyptian: "Égyptien",
  Filipino: "Philippin",
  French: "Français",
  Greek: "Grec",
  Indian: "Indien",
  Irish: "Irlandais",
  Italian: "Italien",
  Jamaican: "Jamaïcain",
  Japanese: "Japonais",
  Kenyan: "Kényan",
  Malaysian: "Malaisien",
  Mexican: "Mexicain",
  Moroccan: "Marocain",
  Polish: "Polonais",
  Portuguese: "Portugais",
  Russian: "Russe",
  Spanish: "Espagnol",
  Thai: "Thaïlandais",
  Tunisian: "Tunisien",
  Turkish: "Turc",
  Ukrainian: "Ukrainien",
  Vietnamese: "Vietnamien",
};

const mealDbBaseUrl =
  process.env.THEMEALDB_BASE_URL ??
  "https://www.themealdb.com/api/json/v1/1";

const asMeal = (value: unknown): Meal | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Meal)
    : null;

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const normalizedKey = (value: string): string => value.trim().toLowerCase();

const translateLabel = (
  value: unknown,
  translations: Record<string, string>,
): string | null => {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const entry = Object.entries(translations).find(
    ([english]) => normalizedKey(english) === normalizedKey(value),
  );
  return entry?.[1] ?? value;
};

const toEnglishFilter = (
  value: string,
  translations: Record<string, string>,
): string => {
  const entry = Object.entries(translations).find(
    ([english, french]) =>
      normalizedKey(english) === normalizedKey(value) ||
      normalizedKey(french) === normalizedKey(value),
  );
  return entry?.[0] ?? value;
};

const getCached = async <T>(
  key: string,
  loader: () => Promise<T>,
): Promise<T> => {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value as T;
  if (cached) cache.delete(key);

  const value = await loader();
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_DURATION });
  return value;
};

const fetchMealDb = async (endpoint: string, query: Record<string, string>) => {
  const url = new URL(`${mealDbBaseUrl}/${endpoint}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  return getCached(url.toString(), async () => {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      throw new Error(`THEMEALDB_HTTP_${response.status}`);
    }
    return response.json() as Promise<unknown>;
  });
};

const translateInstructions = async (text: string): Promise<string> => {
  const trimmed = text.trim();
  if (trimmed.length === 0) return "";

  const cached = translatedTextCache.get(trimmed);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value as string;
  }

  const deeplKey = process.env.DEEPL_AUTH_KEY;
  const googleKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  let translation: string | undefined;

  if (deeplKey) {
    const form = new URLSearchParams({
      text: trimmed,
      target_lang: "FR",
    });
    const response = await fetch(
      process.env.DEEPL_API_URL ??
        "https://api-free.deepl.com/v2/translate",
      {
        method: "POST",
        headers: {
          Authorization: `DeepL-Auth-Key ${deeplKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form,
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!response.ok) throw new Error(`DEEPL_HTTP_${response.status}`);
    const payload = (await response.json()) as {
      translations?: Array<{ text?: string }>;
    };
    translation = payload.translations?.[0]?.text;
  } else if (googleKey) {
    const url = new URL(
      "https://translation.googleapis.com/language/translate/v2",
    );
    url.searchParams.set("key", googleKey);
    url.searchParams.set("q", trimmed);
    url.searchParams.set("target", "fr");
    url.searchParams.set("format", "text");
    const response = await fetch(url, {
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) {
      throw new Error(`GOOGLE_TRANSLATE_HTTP_${response.status}`);
    }
    const payload = (await response.json()) as {
      data?: { translations?: Array<{ translatedText?: string }> };
    };
    translation = payload.data?.translations?.[0]?.translatedText;
  } else {
    throw new Error("MEAL_TRANSLATION_NOT_CONFIGURED");
  }

  if (!translation) throw new Error("MEAL_TRANSLATION_FAILED");
  if (translatedTextCache.size >= MAX_TRANSLATED_TEXT_ENTRIES) {
    const oldestKey = translatedTextCache.keys().next().value;
    if (oldestKey !== undefined) translatedTextCache.delete(oldestKey);
  }
  translatedTextCache.set(trimmed, {
    value: translation,
    expiresAt: Date.now() + CACHE_DURATION,
  });
  return translation;
};

const mapMeal = async (
  meal: Meal,
  options: { translateInstructions: boolean },
): Promise<Meal> => {
  const mapped: Meal = {
    idMeal: asString(meal.idMeal),
    strMeal: asString(meal.strMeal),
    strCategory: translateLabel(meal.strCategory, categoryTranslations),
    strArea: translateLabel(meal.strArea, areaTranslations),
    strInstructions: options.translateInstructions
      ? await translateInstructions(asString(meal.strInstructions))
      : "",
    strMealThumb: asString(meal.strMealThumb) || null,
    strYoutube: asString(meal.strYoutube) || null,
    strTags: asString(meal.strTags) || null,
  };

  for (let index = 1; index <= 20; index++) {
    mapped[`strIngredient${index}`] =
      asString(meal[`strIngredient${index}`]) || null;
    mapped[`strMeasure${index}`] = asString(meal[`strMeasure${index}`]) || null;
  }
  return mapped;
};

const mealsFrom = (payload: unknown): Meal[] => {
  const root = asMeal(payload);
  if (!Array.isArray(root?.meals)) return [];
  return root.meals.map(asMeal).filter((meal): meal is Meal => meal !== null);
};

export const searchExternalMeals = async (
  filters: MealSearchFilters,
): Promise<Meal[]> => {
  const query = filters.query?.trim();
  if (query) {
    const payload = await fetchMealDb("search.php", { s: query });
    return Promise.all(
      mealsFrom(payload).map((meal) =>
        mapMeal(meal, { translateInstructions: true }),
      ),
    );
  }

  if (filters.category) {
    const payload = await fetchMealDb("filter.php", {
      c: toEnglishFilter(filters.category, categoryTranslations),
    });
    return Promise.all(
      mealsFrom(payload).map((meal) =>
        mapMeal(
          {
            ...meal,
            strCategory: toEnglishFilter(
              filters.category!,
              categoryTranslations,
            ),
          },
          { translateInstructions: false },
        ),
      ),
    );
  }

  if (filters.area) {
    const payload = await fetchMealDb("filter.php", {
      a: toEnglishFilter(filters.area, areaTranslations),
    });
    return Promise.all(
      mealsFrom(payload).map((meal) =>
        mapMeal(
          {
            ...meal,
            strArea: toEnglishFilter(filters.area!, areaTranslations),
          },
          { translateInstructions: false },
        ),
      ),
    );
  }

  if (filters.ingredient) {
    const payload = await fetchMealDb("filter.php", {
      i: filters.ingredient.trim(),
    });
    return Promise.all(
      mealsFrom(payload).map((meal) =>
        mapMeal(meal, { translateInstructions: false }),
      ),
    );
  }

  const payload = await fetchMealDb("search.php", { f: "a" });
  return Promise.all(
    mealsFrom(payload).map((meal) =>
      mapMeal(meal, { translateInstructions: true }),
    ),
  );
};

export const getExternalMealCategories = async (): Promise<Meal[]> => {
  const payload = await fetchMealDb("categories.php", {});
  const root = asMeal(payload);
  if (!Array.isArray(root?.categories)) return [];
  return root.categories
    .map(asMeal)
    .filter((category): category is Meal => category !== null)
    .map((category) => ({
      ...category,
      strCategory: translateLabel(category.strCategory, categoryTranslations),
    }));
};

export const getExternalMeal = async (id: string): Promise<Meal> => {
  const payload = await fetchMealDb("lookup.php", { i: id });
  const meal = mealsFrom(payload)[0];
  if (!meal) throw new Error("MEAL_NOT_FOUND");
  return mapMeal(meal, { translateInstructions: true });
};
