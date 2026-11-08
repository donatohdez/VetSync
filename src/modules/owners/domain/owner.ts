export interface Owner {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}
export interface OwnerRepository {
  create(owner: Owner): Promise<void>;
  list(): Promise<Owner[]>;
}
