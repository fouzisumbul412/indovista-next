// export interface Category {
//   id: string;
//   name: string;
//   hsCode?: string | null;
//   temperature?: string | null;
//   storageType: "AMBIENT" | "CHILLED" | "FROZEN";
//   documents?: string | null;
//   notes?: string | null;
//   createdAt?: string;
//   updatedAt?: string;
// }

import { TemperaturePreset } from "./temperature";

export type Category = {
  id: string;
  name: string;
  hsCode?: string | null;
  storageType: "AMBIENT" | "CHILLED" | "FROZEN";
  documents?: string | null;
  notes?: string | null;

  temperatureId?: number | null;
  temperature?: TemperaturePreset | null;

  createdAt: string;
  updatedAt: string;
};
