declare module "zipcodes" {
  export function distance(zipA: string, zipB: string): number | undefined;
  export function lookup(zip: string): { latitude: number; longitude: number } | undefined;
}
