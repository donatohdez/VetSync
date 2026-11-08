export interface MedicalRecord {
  id: string;
  petId: string;
  veterinarianId: string;
  recordedAt: Date;
  clinicalNote: string;
}
export interface MedicalRecordRepository {
  create(record: MedicalRecord): Promise<void>;
  list(petId: string): Promise<MedicalRecord[]>;
}
export interface ClinicalReferences {
  petExists(id: string): Promise<boolean>;
  veterinarianExists(id: string): Promise<boolean>;
}
