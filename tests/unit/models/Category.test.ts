import { v4 as uuidv4 } from 'uuid';

import { Category } from '../../../src/models/Category';

describe('Category Model', () => {
  it('should create a valid Category instance', () => {
    const categoryData = {
      name: 'Test Category',
      householdId: uuidv4(),
    };

    const category = new Category(categoryData.name, categoryData.householdId);

    expect(category).toBeInstanceOf(Category);
    expect(category.id).toBeDefined();
    expect(category.name).toBe(categoryData.name);
    expect(category.householdId).toBe(categoryData.householdId);
  });

  it('should validate a Category instance', () => {
    const validCategory = new Category('Valid Category', uuidv4());
    const invalidCategory = new Category('', uuidv4());

    expect(validCategory.validate()).toHaveLength(0);
    expect(invalidCategory.validate()).toContain('Name is required');
  });

  it('should convert to and from database format', () => {
    const categoryData = {
      name: 'Test Category',
      householdId: uuidv4(),
    };

    const category = new Category(categoryData.name, categoryData.householdId);
    const dbFormat = category.toDatabase();

    expect(dbFormat).toHaveProperty('id');
    expect(dbFormat).toHaveProperty('name', categoryData.name);
    expect(dbFormat).toHaveProperty('household_id', categoryData.householdId);

    const reconstructedCategory = Category.fromDatabase(dbFormat);

    expect(reconstructedCategory).toBeInstanceOf(Category);
    expect(reconstructedCategory.id).toBe(category.id);
    expect(reconstructedCategory.name).toBe(category.name);
    expect(reconstructedCategory.householdId).toBe(category.householdId);
  });

  it('should generate a new UUID if not provided', () => {
    const category = new Category('New Category', uuidv4());
    expect(category.id).toBeDefined();
    expect(typeof category.id).toBe('string');
  });

  it('should use provided UUID if given', () => {
    const id = uuidv4();
    const category = new Category('New Category', uuidv4(), id);
    expect(category.id).toBe(id);
  });

  it('should validate household ID', () => {
    const invalidCategory = new Category('Valid Name', '');
    expect(invalidCategory.validate()).toContain('Household ID is required');
  });
});
