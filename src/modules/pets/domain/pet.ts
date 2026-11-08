export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: string;
  breed: string | null;
  birthDate: string | null;
}
export interface PetRepository {
  create(pet: Pet): Promise<void>;
  list(): Promise<Pet[]>;
  exists(id: string): Promise<boolean>;
  ownerExists(id: string): Promise<boolean>;
}
