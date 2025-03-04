const mockToast = {
  toast: jest.fn(),
  dismiss: jest.fn(),
  toasts: [],
};

// Create a mock implementation for useToast
const useToast = jest.fn(() => mockToast);

// Export both the mock function and the mock object
export { useToast, mockToast };

jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => mockToast,
}));