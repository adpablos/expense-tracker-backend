import { v4 as uuidv4 } from 'uuid';

interface HouseholdData {
  id?: string;
  name: string;
  created_at: Date | string;
  updated_at: Date | string;
}

export class Household {
  public id: string;
  public name: string;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(name: string, id?: string, createdAt?: Date, updatedAt?: Date) {
    this.id = id || uuidv4();
    this.name = name;
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  static fromDatabase(data: HouseholdData): Household {
    return new Household(data.name, data.id, new Date(data.created_at), new Date(data.updated_at));
  }

  toDatabase(): HouseholdData {
    return {
      id: this.id,
      name: this.name,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    };
  }

  validate(): string[] {
    const errors: string[] = [];
    if (!this.name) errors.push('Name is required');
    return errors;
  }
}
