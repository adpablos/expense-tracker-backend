import { v4 as uuidv4 } from 'uuid';

export class Expense {
    public id: string;
    public description: string;
    public amount: number;
    public category: string;
    public subcategory: string;
    public date: Date;

    constructor(
        description: string,
        amount: number,
        category: string,
        subcategory: string,
        date: Date,
        id?: string
    ) {
        this.id = id || uuidv4();
        this.description = description;
        this.amount = amount;
        this.category = category;
        this.subcategory = subcategory;
        this.date = date;
    }

    static fromDatabase(data: any): Expense {
        return new Expense(
            data.description,
            data.amount,
            data.category,
            data.subcategory,
            new Date(data.date),
            data.id
        );
    }

    toDatabase(): any {
        return {
            id: this.id,
            description: this.description,
            amount: this.amount,
            category: this.category,
            subcategory: this.subcategory,
            date: this.date.toISOString().split('T')[0] // Format as YYYY-MM-DD
        };
    }

    validate(): string[] {
        const errors: string[] = [];
        if (!this.description) errors.push('Description is required');
        if (this.amount <= 0) errors.push('Amount must be greater than 0');
        if (!this.category) errors.push('Category is required');
        if (!this.subcategory) errors.push('Subcategory is required');
        if (!(this.date instanceof Date) || isNaN(this.date.getTime())) errors.push('Invalid date');
        return errors;
    }
}