import { v4 as uuidv4 } from 'uuid';

export class User {
    public id: string;
    public email: string;
    public name: string;
    public authProviderId: string;
    public households: string[];

    constructor(email: string, name: string, authProviderId: string, id?: string, households: string[] = []) {
        this.id = id || uuidv4();
        this.email = email;
        this.name = name;
        this.authProviderId = authProviderId;
        this.households = households;
    }

    static fromDatabase(data: any): User {
        return new User(
            data.email,
            data.name,
            data.auth_provider_id,
            data.id,
            Array.isArray(data.households) ? data.households : [data.households].filter(Boolean)
        );
    }

    toDatabase(): any {
        return {
            id: this.id,
            email: this.email,
            name: this.name,
            auth_provider_id: this.authProviderId,
            households: this.households
        };
    }

    validate(): string[] {
        const errors: string[] = [];
        if (!this.email) errors.push('Email is required');
        if (!this.name) errors.push('Name is required');
        if (!this.authProviderId) errors.push('Auth provider ID is required');
        return errors;
    }

    addHousehold(householdId: string) {
        if (!this.households.includes(householdId)) {
            this.households.push(householdId);
        }
    }

    removeHousehold(householdId: string) {
        this.households = this.households.filter(id => id !== householdId);
    }
}