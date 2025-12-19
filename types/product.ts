import { TemperaturePreset } from "./temperature";
import type { Currency } from "./currency";

export type Product = {
  id: string;
  name: string;
  type: "FROZEN" | "SPICE";

  hsCode?: string | null;
  packSize?: string | null;
  shelfLife?: string | null;

  // ✅ Pricing
  unitPrice?: number | null;
  currencyCode: string;
  currency?: Pick<Currency, "currencyCode" | "name" | "exchangeRate"> | null;

  unitsPerCarton?: number | null;
  cartonsPerPallet?: number | null;
  notes?: string | null;

  categoryId: string;
  category?: { id: string; name: string } | null;

  temperatureId?: number | null;
  temperature?: TemperaturePreset | null;

  createdAt: string;
  updatedAt: string;
};
