import { QueryResult, QueryResultRow } from 'pg';

export function createMockQueryResult<T extends QueryResultRow>(
  rows: T[],
  rowCount?: number
): QueryResult<T> {
  return {
    rows,
    rowCount: rowCount ?? rows.length,
    command: '',
    oid: 0,
    fields: [],
  };
}

export const mockUserId = 'd59c6410-45d8-4646-84be-6a24a14de81c';
export const mockHouseholdId = 'e70e8400-c09c-4a77-8f08-6f8f9f7b6f5d';
