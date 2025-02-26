const mockSMA = jest.fn().mockReturnValue([100, 101, 102]);
const mockRSI = jest.fn().mockReturnValue([60, 62, 65]);
const mockMACD = jest.fn().mockReturnValue({
  macd: [1, 1.2, 1.4],
  signal: [0.8, 1.0, 1.2],
  histogram: [0.2, 0.2, 0.2],
});
const mockCDLENGULFING = jest.fn().mockReturnValue([0, 0, 100]);
const mockCDLHAMMER = jest.fn().mockReturnValue([0, 0, 0]);
const mockCDLMORNINGSTAR = jest.fn().mockReturnValue([0, 0, 0]);

const mockExecute = jest.fn().mockImplementation((functionName: string, inputs: any) => {
  const functions: { [key: string]: jest.Mock } = {
    SMA: mockSMA,
    RSI: mockRSI,
    MACD: mockMACD,
    CDLENGULFING: mockCDLENGULFING,
    CDLHAMMER: mockCDLHAMMER,
    CDLMORNINGSTAR: mockCDLMORNINGSTAR,
  };

  const fn = functions[functionName];
  if (fn) {
    return Promise.resolve(fn(inputs));
  }
  return Promise.reject(new Error(`Unknown function: ${functionName}`));
});

const mockSetError = jest.fn().mockImplementation((shouldError: boolean) => {
  if (shouldError) {
    mockExecute.mockRejectedValue(new Error('TA-Lib error'));
  } else {
    mockExecute.mockImplementation((functionName: string, inputs: any) => {
      const functions: { [key: string]: jest.Mock } = {
        SMA: mockSMA,
        RSI: mockRSI,
        MACD: mockMACD,
        CDLENGULFING: mockCDLENGULFING,
        CDLHAMMER: mockCDLHAMMER,
        CDLMORNINGSTAR: mockCDLMORNINGSTAR,
      };

      const fn = functions[functionName];
      if (fn) {
        return Promise.resolve(fn(inputs));
      }
      return Promise.reject(new Error(`Unknown function: ${functionName}`));
    });
  }
});

export default {
  SMA: mockSMA,
  RSI: mockRSI,
  MACD: mockMACD,
  CDLENGULFING: mockCDLENGULFING,
  CDLHAMMER: mockCDLHAMMER,
  CDLMORNINGSTAR: mockCDLMORNINGSTAR,
  execute: mockExecute,
  setError: mockSetError,
};