import { v4 as uuidv4 } from 'uuid';

export class Expense {
    public id: string;
    public description: string;
    public amount: number;
    public category: string;
    public subcategory: string;
    public expenseDatetime: Date;
    public createdAt: Date;
    public updatedAt: Date;
    public householdId: string;

    constructor(
        description: string,
        amount: number,
        category: string,
        subcategory: string,
        householdId: string,
        expenseDatetime: Date = new Date(),
        createdAt: Date = new Date(),
        updatedAt: Date = new Date(),
        id?: string
    ) {
        this.id = id || uuidv4();
        this.description = description;
        this.amount = amount;
        this.category = category;
        this.subcategory = subcategory;
        this.expenseDatetime = expenseDatetime;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
        this.householdId = householdId;
    }

    static fromDatabase(data: any): Expense {
        return new Expense(
            data.description,
            data.amount,
            data.category,
            data.subcategory,
            data.household_id,
            new Date(data.expense_datetime),
            new Date(data.created_at),
            new Date(data.updated_at),
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
            expense_datetime: this.expenseDatetime,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
            household_id: this.householdId
        };
    }

    validate(): string[] {
        const errors: string[] = [];
        if (!this.description) errors.push('Description is required');
        if (this.amount <= 0) errors.push('Amount must be greater than 0');
        if (!this.category) errors.push('Category is required');
        if (!this.subcategory) errors.push('Subcategory is required');
        if (isNaN(this.expenseDatetime.getTime())) errors.push('Invalid expense datetime');
        return errors;
    }
}
