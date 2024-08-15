import {v4 as uuidv4} from 'uuid';

export class Category {
    public id: string;
    public name: string;
    public householdId: string;

    constructor(name: string, householdId: string, id?: string) {
        this.id = id || uuidv4();
        this.name = name;
        this.householdId = householdId;
    }

    static fromDatabase(data: any): Category {
        return new Category(data.name, data.household_id, data.id);
    }

    toDatabase(): any {
        return {
            id: this.id,
            name: this.name,
            household_id: this.householdId
        };
    }

    validate(): string[] {
        const errors: string[] = [];
        if (!this.name) errors.push('Name is required');
        return errors;
    }
}
