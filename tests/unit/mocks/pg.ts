const mockPool = {
  query: jest.fn(),
  on: jest.fn(),
  connect: jest.fn().mockResolvedValue(undefined),
};

const types = {
  setTypeParser: jest.fn(),
};

module.exports = { Pool: jest.fn(() => mockPool), types };
