export type TemperaturePreset = {
  id: number;
  name: string;
  range: string;
  tolerance: string;
  setPoint?: number | null;
  unit: "C" | "F";
};
