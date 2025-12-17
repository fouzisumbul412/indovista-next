// export type ProductType = "FROZEN" | "SPICE";

// export interface Product {
//   id: string;
//   name: string;

//   type: ProductType;

//   hsCode?: string | null;
//   temperature?: string | null;
//   packSize?: string | null;
//   shelfLife?: string | null;

//   unitsPerCarton?: number | null;
//   cartonsPerPallet?: number | null;
//   notes?: string | null;

//   categoryId: string;

  
//   category?: {
//     id: string;
//     name: string;
//   } | null;

//   createdAt?: string;
//   updatedAt?: string;
// }
import { TemperaturePreset } from "./temperature";

export type Product = {
  id: string;
  name: string;
  type: "FROZEN" | "SPICE";

  hsCode?: string | null;
  packSize?: string | null;
  shelfLife?: string | null;
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
