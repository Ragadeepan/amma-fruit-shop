import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { fruitsApi } from "../../shared/api/modules/fruitsApi.js";
import { useCart } from "../../features/cart/hooks/useCart.js";

const DEFAULT_QUANTITY = 1;
const SKELETON_ITEMS = 8;

const formatPrice = (value) => `Rs ${Number(value).toFixed(2)}`;

export const HomePage = () => {
  const { t } = useTranslation();
  const { addItem } = useCart();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [fruits, setFruits] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState("all");
  const [quantities, setQuantities] = useState({});

  const fetchFruits = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await fruitsApi.list({ limit: 100, page: 1 });
      const fetchedFruits = response.fruits ?? [];
      setFruits(fetchedFruits);
      setQuantities((current) => {
        const next = { ...current };
        fetchedFruits.forEach((fruit) => {
          if (!next[fruit._id]) {
            next[fruit._id] = DEFAULT_QUANTITY;
          }
        });
        return next;
      });
    } catch (requestError) {
      setError(requestError.response?.data?.message ?? t("home.loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchFruits();
  }, [fetchFruits]);

  const categories = useMemo(() => {
    const categorySet = new Set(
      fruits.map((fruit) => fruit.category).filter(Boolean).sort(),
    );
    return ["all", ...Array.from(categorySet)];
  }, [fruits]);

  const filteredFruits = useMemo(() => {
    return fruits.filter((fruit) => {
      const matchesSearch = fruit.name
        .toLowerCase()
        .includes(searchValue.trim().toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || fruit.category === selectedCategory;
      const matchesAvailability =
        availabilityFilter === "all" ||
        (availabilityFilter === "available" && fruit.isAvailable) ||
        (availabilityFilter === "unavailable" && !fruit.isAvailable);

      return matchesSearch && matchesCategory && matchesAvailability;
    });
  }, [availabilityFilter, fruits, searchValue, selectedCategory]);

  const handleQuantityChange = (fruitId, value) => {
    const nextValue = Number(value);
    if (!Number.isFinite(nextValue)) {
      return;
    }

    setQuantities((current) => ({
      ...current,
      [fruitId]: Math.max(0.25, Math.min(200, Number(nextValue.toFixed(2)))),
    }));
  };

  const handleAddToCart = (fruit) => {
    const quantityKg = quantities[fruit._id] ?? DEFAULT_QUANTITY;
    addItem(fruit, quantityKg);
  };

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">{t("homePage.title")}</h2>
        <p className="text-sm text-muted">
          {t("homePage.description")}
        </p>
      </div>

      <div className="glass-card space-y-3 p-5">
        <h3 className="text-xl font-semibold">{t("homePage.infoTitle")}</h3>
        <p className="text-sm leading-6 text-muted">
          {t("homePage.infoParagraphOne")}
        </p>
        <p className="text-sm leading-6 text-muted">
          {t("homePage.infoParagraphTwo")}
        </p>
      </div>

      <div className="glass-card grid gap-3 p-4 md:grid-cols-4">
        <label className="floating-field md:col-span-2">
          <input
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder=" "
            type="text"
            value={searchValue}
          />
          <span>{t("homePage.searchLabel")}</span>
        </label>

        <label className="floating-field">
          <select
            onChange={(event) => setSelectedCategory(event.target.value)}
            value={selectedCategory}
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === "all" ? t("homePage.allCategories") : category}
              </option>
            ))}
          </select>
          <span>{t("homePage.categoryLabel")}</span>
        </label>

        <label className="floating-field">
          <select
            onChange={(event) => setAvailabilityFilter(event.target.value)}
            value={availabilityFilter}
          >
            <option value="all">{t("homePage.availability.all")}</option>
            <option value="available">{t("homePage.availability.available")}</option>
            <option value="unavailable">{t("homePage.availability.unavailable")}</option>
          </select>
          <span>{t("homePage.availabilityLabel")}</span>
        </label>
      </div>

      {error ? <p className="rounded-xl border border-red-500/60 bg-red-500/10 p-3 text-sm">{error}</p> : null}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: SKELETON_ITEMS }).map((_, index) => (
            <div key={index} className="glass-card overflow-hidden">
              <div className="h-40 w-full animate-pulse bg-white/10" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-full animate-pulse rounded bg-white/10" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-white/10" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredFruits.map((fruit) => {
            const quantityKg = quantities[fruit._id] ?? DEFAULT_QUANTITY;
            const currentTotal = Number(fruit.pricePerKg) * Number(quantityKg);

            return (
              <article key={fruit._id} className="glass-card flex flex-col overflow-hidden">
                <div className="relative">
                  <img
                    alt={fruit.name}
                    className="h-44 w-full object-cover"
                    src={fruit.imageUrl}
                  />
                  {!fruit.isAvailable ? (
                    <span className="absolute left-3 top-3 rounded-full bg-red-600 px-2 py-1 text-xs font-semibold text-white">
                      {t("homePage.unavailable")}
                    </span>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col p-4">
                  <h3 className="text-lg font-semibold">{fruit.name}</h3>
                  <p className="mt-1 text-sm text-muted">{fruit.description}</p>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                    <p className="text-muted">{t("homePage.pricePerKg")}</p>
                    <p className="text-right font-medium">{formatPrice(fruit.pricePerKg)}</p>
                    <p className="text-muted">{t("homePage.stock")}</p>
                    <p className="text-right font-medium">
                      {fruit.stockKg} {t("homePage.kg")}
                    </p>
                  </div>

                  <label className="floating-field mt-4">
                    <input
                      max={Math.max(0.25, fruit.stockKg)}
                      min={0.25}
                      onChange={(event) =>
                        handleQuantityChange(fruit._id, event.target.value)
                      }
                      placeholder=" "
                      step={0.25}
                      type="number"
                      value={quantityKg}
                    />
                    <span>{t("homePage.quantityLabel")}</span>
                  </label>

                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-sm text-muted">{t("homePage.total")}</p>
                    <p className="text-lg font-semibold">{formatPrice(currentTotal)}</p>
                  </div>

                  <button
                    className="gradient-btn mt-4 py-2 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!fruit.isAvailable || fruit.stockKg <= 0}
                    onClick={() => handleAddToCart(fruit)}
                    type="button"
                  >
                    {t("homePage.addToCart")}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};
