import { renderHook, act } from "@testing-library/react-native";
import { useScrollToTop, SCROLL_TO_TOP_THRESHOLD } from "@/hooks/useScrollToTop";

const scrollEvent = (y: number) =>
  ({ nativeEvent: { contentOffset: { y } } }) as never;

describe("useScrollToTop", () => {
  it("stays hidden until the threshold is passed", () => {
    const { result } = renderHook(() => useScrollToTop());
    expect(result.current.visible).toBe(false);

    act(() => result.current.onScroll(scrollEvent(SCROLL_TO_TOP_THRESHOLD - 1)));
    expect(result.current.visible).toBe(false);

    act(() => result.current.onScroll(scrollEvent(SCROLL_TO_TOP_THRESHOLD + 1)));
    expect(result.current.visible).toBe(true);
  });

  it("hides again when scrolled back up", () => {
    const { result } = renderHook(() => useScrollToTop());
    act(() => result.current.onScroll(scrollEvent(2000)));
    expect(result.current.visible).toBe(true);
    act(() => result.current.onScroll(scrollEvent(0)));
    expect(result.current.visible).toBe(false);
  });

  it("honours a custom threshold", () => {
    const { result } = renderHook(() => useScrollToTop(100));
    act(() => result.current.onScroll(scrollEvent(150)));
    expect(result.current.visible).toBe(true);
  });

  it("uses scrollToOffset for list refs (FlashList / FlatList)", () => {
    const { result } = renderHook(() => useScrollToTop());
    const scrollToOffset = jest.fn();
    result.current.ref.current = { scrollToOffset } as never;

    act(() => result.current.onScroll(scrollEvent(2000)));
    act(() => result.current.scrollToTop());

    expect(scrollToOffset).toHaveBeenCalledWith({ offset: 0, animated: true });
    // Hidden straight away, so a second tap can't land mid-animation.
    expect(result.current.visible).toBe(false);
  });

  it("falls back to scrollTo for a ScrollView ref", () => {
    const { result } = renderHook(() => useScrollToTop());
    const scrollTo = jest.fn();
    result.current.ref.current = { scrollTo } as never;

    act(() => result.current.scrollToTop());
    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: true });
  });

  it("does not throw when nothing is attached yet", () => {
    const { result } = renderHook(() => useScrollToTop());
    expect(() => act(() => result.current.scrollToTop())).not.toThrow();
  });
});
