export interface Veterinarian {
  id: string;
  name: string;
}
export interface VeterinarianRepository {
  list(): Promise<Veterinarian[]>;
  exists(id: string): Promise<boolean>;
}
