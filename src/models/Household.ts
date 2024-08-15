import { v4 as uuidv4 } from 'uuid';

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

    static fromDatabase(data: any): Household {
        return new Household(
            data.name,
            data.id,
            data.created_at,
            data.updated_at
        );
    }

    toDatabase(): any {
        return {
            id: this.id,
            name: this.name,
            created_at: this.createdAt,
            updated_at: this.updatedAt
        };
    }

    validate(): string[] {
        const errors: string[] = [];
        if (!this.name) errors.push('Name is required');
        return errors;
    }
}