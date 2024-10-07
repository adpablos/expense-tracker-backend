export interface DatabaseError extends Error {
  code?: string;
  detail?: string;
}
