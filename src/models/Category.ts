import { v4 as uuidv4 } from 'uuid';

export class Category {
    public id: string;
    public name: string;

    constructor(name: string, id?: string) {
        this.id = id || uuidv4();
        this.name = name;
    }

    static fromDatabase(data: any): Category {
        return new Category(data.name, data.id);
    }

    toDatabase(): any {
        return {
            id: this.id,
            name: this.name
        };
    }

    validate(): string[] {
        const errors: string[] = [];
        if (!this.name) errors.push('Name is required');
        return errors;
    }
}
