export const DI_TYPES = {
  // Services
  CategoryService: Symbol.for('CategoryService'),
  SubcategoryService: Symbol.for('SubcategoryService'),
  ExpenseService: Symbol.for('ExpenseService'),
  HouseholdService: Symbol.for('HouseholdService'),
  TransactionService: Symbol.for('TransactionService'),
  UserService: Symbol.for('UserService'),
  NotificationService: Symbol.for('NotificationService'),
  CategoryHierarchyService: Symbol.for('CategoryHierarchyService'),
  OpenAIService: Symbol.for('OpenAIService'),
  FileProcessor: Symbol.for('FileProcessor'),
  FileProcessorFactory: Symbol.for('FileProcessorFactory'),
  ImageProcessor: Symbol.for('ImageProcessor'),
  AudioProcessor: Symbol.for('AudioProcessor'),
  AudioConverter: Symbol.for('AudioConverter'),
  TempFileHandler: Symbol.for('TempFileHandler'),
  // Add other services here as needed

  // Controllers
  CategoryController: Symbol.for('CategoryController'),
  SubcategoryController: Symbol.for('SubcategoryController'),
  ExpenseController: Symbol.for('ExpenseController'),
  HouseholdController: Symbol.for('HouseholdController'),
  UserController: Symbol.for('UserController'),
  // Add other controllers here as needed

  // Middleware
  HouseholdMiddleware: Symbol.for('HouseholdMiddleware'),
  AuthMiddleware: Symbol.for('AuthMiddleware'),
  RequestLogger: Symbol.for('RequestLogger'),
  ResponseLogger: Symbol.for('ResponseLogger'),
  // Add other middleware here as needed

  // Database
  DbPool: Symbol.for('DbPool'),
  HouseholdRepository: Symbol.for('HouseholdRepository'),
  UserRepository: Symbol.for('UserRepository'),
  CategoryRepository: Symbol.for('CategoryRepository'),
  SubcategoryRepository: Symbol.for('SubcategoryRepository'),
  ExpenseRepository: Symbol.for('ExpenseRepository'),
  UserHouseholdTransactionCoordinator: Symbol.for('UserHouseholdTransactionCoordinator'),

  // Other
  Logger: Symbol.for('Logger'),
  multer: Symbol.for('multer'),
};
