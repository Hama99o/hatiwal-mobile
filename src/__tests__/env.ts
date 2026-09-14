/**
 * Pin the API base URL BEFORE any module is imported, so the suite is hermetic.
 *
 * WHY: docker-compose sets `EXPO_PUBLIC_API_URL` from `HOST_IP` (e.g.
 * `http://192.168.1.24:3007/api/v1`) so the Android emulator can reach the Rails
 * API across the LAN. Jest runs in that same container and inherits it. But all
 * 137 MSW handlers register `http://localhost:3007`, so every request missed its
 * mock and fell through to a REAL network call — the API tests were quietly
 * talking to the dev server and failing on its 401s.
 *
 * That is not a flaky test, it is a test that isn't testing: a mocked 200 and a
 * live 401 are indistinguishable to anyone reading "3 failed". It also means a
 * plain `npx jest` generated real traffic against whatever `HOST_IP` pointed at.
 *
 * `src/api/http.ts` already falls back to exactly this URL, so this only undoes
 * the container's override. Runs in `setupFiles` (not `setupFilesAfterEnv`)
 * because it must land before `src/api/http.ts` is first imported.
 */
process.env.EXPO_PUBLIC_API_URL = "http://localhost:3007/api/v1";
