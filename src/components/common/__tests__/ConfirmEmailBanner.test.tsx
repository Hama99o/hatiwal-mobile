import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { ConfirmEmailBanner } from "@/components/common/ConfirmEmailBanner";
import { authAPI } from "@/api/auth";
import { toast } from "@/lib/toast";

jest.mock("@/api/auth", () => ({ authAPI: { resendConfirmation: jest.fn() } }));
jest.mock("@/lib/toast", () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const mockResend = authAPI.resendConfirmation as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockResend.mockResolvedValue(undefined);
});

describe("ConfirmEmailBanner — when it shows", () => {
  it("shows for an unconfirmed account", () => {
    render(<ConfirmEmailBanner email="a@b.com" confirmed={false} />);
    expect(screen.getByTestId("confirm-email-banner")).toBeTruthy();
  });

  it("renders nothing once confirmed", () => {
    render(<ConfirmEmailBanner email="a@b.com" confirmed />);
    expect(screen.queryByTestId("confirm-email-banner")).toBeNull();
  });

  // An older API build does not send the flag. Treating undefined as CONFIRMED
  // keeps the prompt from appearing for someone who cannot act on it.
  it("renders nothing when the API did not send the flag", () => {
    render(<ConfirmEmailBanner email="a@b.com" confirmed={undefined} />);
    expect(screen.queryByTestId("confirm-email-banner")).toBeNull();
  });

  // Resend needs an address to send to; without one the prompt would be a dead end.
  it("renders nothing without an email address", () => {
    render(<ConfirmEmailBanner email={null} confirmed={false} />);
    expect(screen.queryByTestId("confirm-email-banner")).toBeNull();
  });
});

describe("ConfirmEmailBanner — resend", () => {
  it("resends to the account's own address", async () => {
    render(<ConfirmEmailBanner email="a@b.com" confirmed={false} />);
    fireEvent.press(screen.getByTestId("confirm-email-resend"));
    await waitFor(() => expect(mockResend).toHaveBeenCalledWith("a@b.com"));
  });

  it("confirms to the user that it was sent", async () => {
    render(<ConfirmEmailBanner email="a@b.com" confirmed={false} />);
    fireEvent.press(screen.getByTestId("confirm-email-resend"));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  // A silent failure here is the worst outcome: the user waits for a mail that is
  // never coming and has no reason to try again.
  it("tells the user when it failed", async () => {
    mockResend.mockRejectedValueOnce(new Error("network"));
    render(<ConfirmEmailBanner email="a@b.com" confirmed={false} />);
    fireEvent.press(screen.getByTestId("confirm-email-resend"));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it("ignores a second press while the first is in flight", async () => {
    let release: (v?: unknown) => void = () => {};
    mockResend.mockImplementationOnce(() => new Promise((r) => { release = r; }));
    render(<ConfirmEmailBanner email="a@b.com" confirmed={false} />);
    const btn = screen.getByTestId("confirm-email-resend");
    fireEvent.press(btn);
    fireEvent.press(btn);
    expect(mockResend).toHaveBeenCalledTimes(1);
    release();
  });
});
