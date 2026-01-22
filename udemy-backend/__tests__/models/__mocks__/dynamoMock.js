export const sendMock = vi.fn();

export const docClient = {
  send: sendMock,
};

export const TABLE_NAME = "UdemyPlatformTest";
