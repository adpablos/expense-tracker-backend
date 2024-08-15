import { v4 as uuidv4 } from 'uuid';

export class User {
    public id: string;
    public email: string;
    public name: string;
    public authProviderId: string;
    public householdId: string | null;

    constructor(email: string, name: string, authProviderId: string, householdId: string | null = null, id?: string) {
        this.id = id || uuidv4();
        this.email = email;
        this.name = name;
        this.authProviderId = authProviderId;
        this.householdId = householdId;
    }

    static fromDatabase(data: any): User {
        return new User(data.email, data.name, data.auth_provider_id, data.household_id, data.id);
    }

    toDatabase(): any {
        return {
            id: this.id,
            email: this.email,
            name: this.name,
            auth_provider_id: this.authProviderId,
            household_id: this.householdId
        };
    }

    validate(): string[] {
        const errors: string[] = [];
        if (!this.email) errors.push('Email is required');
        if (!this.name) errors.push('Name is required');
        if (!this.authProviderId) errors.push('Auth provider ID is required');
        return errors;
    }
}