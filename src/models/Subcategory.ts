import {v4 as uuidv4} from 'uuid';

export class Subcategory {
    public id: string;
    public name: string;
    public categoryId: string;
    public householdId: string;

    constructor(name: string, categoryId: string, householdId: string, id?: string) {
        this.id = id || uuidv4();
        this.name = name;
        this.categoryId = categoryId;
        this.householdId = householdId;
    }

    static fromDatabase(data: any): Subcategory {
        return new Subcategory(data.name, data.category_id, data.household_id, data.id);
    }

    toDatabase(): any {
        return {
            id: this.id,
            name: this.name,
            category_id: this.categoryId,
            household_id: this.householdId
        };
    }

    validate(): string[] {
        const errors: string[] = [];
        if (!this.name) errors.push('Name is required');
        if (!this.categoryId) errors.push('Category ID is required');
        return errors;
    }
}
