import {renderHook, act} from '@testing-library/react';
import {useActiveVisitors} from '../../../src/hooks/useActiveVisitors';

// Mock the @tinybirdco/charts module
vi.mock('@tinybirdco/charts', () => ({
    useQuery: vi.fn()
}));

// Mock the stats-config utils
vi.mock('../../../src/utils/stats-config', () => ({
    getStatEndpointUrl: vi.fn(),
    getToken: vi.fn()
}));

import {useQuery} from '@tinybirdco/charts';
import {getStatEndpointUrl, getToken} from '../../../src/utils/stats-config';

const mockUseQuery = vi.mocked(useQuery);
const mockGetStatEndpointUrl = vi.mocked(getStatEndpointUrl);
const mockGetToken = vi.mocked(getToken);

describe('useActiveVisitors', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockUseQuery.mockReturnValue({
            data: null,
            loading: false,
            error: null
        });
        mockGetStatEndpointUrl.mockImplementation((_config: any, endpoint: any) => `https://api.example.com/${endpoint}`);
        mockGetToken.mockReturnValue('mock-token');
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('returns initial state when enabled is true', () => {
        const {result} = renderHook(() => useActiveVisitors({enabled: true}));

        expect(result.current).toEqual({
            activeVisitors: 0,
            isLoading: false,
            error: null
        });
    });

    it('returns zero state when enabled is false', () => {
        const {result} = renderHook(() => useActiveVisitors({enabled: false}));

        expect(result.current).toEqual({
            activeVisitors: 0,
            isLoading: false,
            error: null
        });
    });

    it('shows loading state only on initial load with no last known count', () => {
        mockUseQuery.mockReturnValue({
            data: null,
            loading: true,
            error: null
        });

        const {result} = renderHook(() => useActiveVisitors({enabled: true}));

        // Should show loading on initial load when no lastKnownCount exists
        expect(result.current.isLoading).toBe(true);
        expect(result.current.activeVisitors).toBe(0);
    });

    it('does not show loading when lastKnownCount exists', () => {
        // First render with data to establish lastKnownCount
        mockUseQuery.mockReturnValue({
            data: [{active_visitors: 25}],
            loading: false,
            error: null
        });

        const {result, rerender} = renderHook(() => useActiveVisitors({enabled: true}));
        expect(result.current.activeVisitors).toBe(25);

        // Second render with loading but data should not show loading
        mockUseQuery.mockReturnValue({
            data: null,
            loading: true,
            error: null
        });

        rerender();

        expect(result.current.isLoading).toBe(false);
        expect(result.current.activeVisitors).toBe(25); // Retains last known count
    });

    it('returns active visitor count from data', () => {
        mockUseQuery.mockReturnValue({
            data: [{active_visitors: 42}],
            loading: false,
            error: null
        });

        const {result} = renderHook(() => useActiveVisitors({enabled: true}));

        expect(result.current.activeVisitors).toBe(42);
        expect(result.current.isLoading).toBe(false);
    });

    it('handles error state', () => {
        const mockError = new Error('Network error');
        mockUseQuery.mockReturnValue({
            data: null,
            loading: false,
            error: mockError
        });

        const {result} = renderHook(() => useActiveVisitors({enabled: true}));

        expect(result.current.error).toBe(mockError);
    });

    it('calls getStatEndpointUrl and getToken with correct parameters', () => {
        const statsConfig = {
            id: 'test-site-id',
            endpoint: 'https://api.test.com',
            token: 'test-token'
        };

        renderHook(() => useActiveVisitors({statsConfig, enabled: true}));

        expect(mockGetStatEndpointUrl).toHaveBeenCalledWith(statsConfig, 'api_active_visitors');
        expect(mockGetToken).toHaveBeenCalledWith(statsConfig);
    });

    it('calls getStatEndpointUrl and getToken with undefined when no statsConfig', () => {
        renderHook(() => useActiveVisitors({enabled: true}));

        expect(mockGetStatEndpointUrl).toHaveBeenCalledWith(undefined, 'api_active_visitors');
        expect(mockGetToken).toHaveBeenCalledWith(undefined);
    });

    it('sets up 60-second interval when enabled', () => {
        renderHook(() => useActiveVisitors({enabled: true}));

        // Initially refreshKey should be 0
        expect(mockUseQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    _refresh: 0
                })
            })
        );

        // Fast-forward 60 seconds
        act(() => {
            vi.advanceTimersByTime(60000);
        });

        // Should increment refreshKey
        expect(mockUseQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    _refresh: 1
                })
            })
        );
    });

    it('does not set up interval when disabled', () => {
        renderHook(() => useActiveVisitors({enabled: false}));

        // Fast-forward 60 seconds
        act(() => {
            vi.advanceTimersByTime(60000);
        });

        // Should still be at refreshKey 0
        expect(mockUseQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    _refresh: 0
                })
            })
        );
    });

    it('includes postUuid in params when provided', () => {
        const postUuid = 'test-post-uuid';
        renderHook(() => useActiveVisitors({postUuid, enabled: true}));

        expect(mockUseQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    post_uuid: postUuid
                })
            })
        );
    });

    it('does not include postUuid in params when not provided', () => {
        renderHook(() => useActiveVisitors({enabled: true}));

        expect(mockUseQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.not.objectContaining({
                    post_uuid: expect.anything()
                })
            })
        );
    });

    it('uses statsConfig for site_uuid', () => {
        const statsConfig = {
            id: 'test-site-id',
            endpoint: 'https://api.test.com',
            token: 'test-token'
        };

        renderHook(() => useActiveVisitors({statsConfig, enabled: true}));

        expect(mockUseQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    site_uuid: 'test-site-id'
                })
            })
        );
    });

    it('uses empty string for site_uuid when no statsConfig', () => {
        renderHook(() => useActiveVisitors({enabled: true}));

        expect(mockUseQuery).toHaveBeenCalledWith(
            expect.objectContaining({
                params: expect.objectContaining({
                    site_uuid: ''
                })
            })
        );
    });

    it('retains last known count after refresh', () => {
        // Initial data
        mockUseQuery.mockReturnValue({
            data: [{active_visitors: 25}],
            loading: false,
            error: null
        });

        const {result, rerender} = renderHook(() => useActiveVisitors({enabled: true}));
        expect(result.current.activeVisitors).toBe(25);

        // Simulate refresh with loading state but no new data
        mockUseQuery.mockReturnValue({
            data: null,
            loading: true,
            error: null
        });

        rerender();

        // Should retain last known count and not show loading
        expect(result.current.activeVisitors).toBe(25);
        expect(result.current.isLoading).toBe(false);
    });

    it('handles zero active visitors correctly', () => {
        mockUseQuery.mockReturnValue({
            data: [{active_visitors: 0}],
            loading: false,
            error: null
        });

        const {result} = renderHook(() => useActiveVisitors({enabled: true}));

        expect(result.current.activeVisitors).toBe(0);
    });

    it('handles invalid data format gracefully', () => {
        mockUseQuery.mockReturnValue({
            data: [{some_other_field: 42}],
            loading: false,
            error: null
        });

        const {result} = renderHook(() => useActiveVisitors({enabled: true}));

        expect(result.current.activeVisitors).toBe(0);
    });

    it('cleans up interval on unmount', () => {
        // Spy on clearInterval before creating the hook
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
        
        const {unmount} = renderHook(() => useActiveVisitors({enabled: true}));

        unmount();

        expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('updates lastKnownCount when new valid data is received', () => {
        // Start with no data
        mockUseQuery.mockReturnValue({
            data: null,
            loading: false,
            error: null
        });

        const {result, rerender} = renderHook(() => useActiveVisitors({enabled: true}));
        expect(result.current.activeVisitors).toBe(0);

        // Provide valid data
        mockUseQuery.mockReturnValue({
            data: [{active_visitors: 15}],
            loading: false,
            error: null
        });

        rerender();

        expect(result.current.activeVisitors).toBe(15);

        // Now when data becomes null again, should retain the count
        mockUseQuery.mockReturnValue({
            data: null,
            loading: false,
            error: null
        });

        rerender();

        expect(result.current.activeVisitors).toBe(15);
    });

    it('handles statsConfig changes correctly', () => {
        const initialStatsConfig = {
            id: 'initial-site-id',
            endpoint: 'https://initial.api.com',
            token: 'initial-token'
        };

        const {rerender} = renderHook(
            ({statsConfig}) => useActiveVisitors({statsConfig, enabled: true}),
            {initialProps: {statsConfig: initialStatsConfig}}
        );

        expect(mockGetStatEndpointUrl).toHaveBeenCalledWith(initialStatsConfig, 'api_active_visitors');
        expect(mockGetToken).toHaveBeenCalledWith(initialStatsConfig);

        // Change statsConfig
        const newStatsConfig = {
            id: 'new-site-id',
            endpoint: 'https://new.api.com',
            token: 'new-token'
        };

        rerender({statsConfig: newStatsConfig});

        expect(mockGetStatEndpointUrl).toHaveBeenCalledWith(newStatsConfig, 'api_active_visitors');
        expect(mockGetToken).toHaveBeenCalledWith(newStatsConfig);
    });

    it('does not update lastKnownCount when disabled', () => {
        // Start enabled with data
        mockUseQuery.mockReturnValue({
            data: [{active_visitors: 20}],
            loading: false,
            error: null
        });

        const {result, rerender} = renderHook(
            ({enabled}) => useActiveVisitors({enabled}),
            {initialProps: {enabled: true}}
        );

        expect(result.current.activeVisitors).toBe(20);

        // Disable and provide new data
        mockUseQuery.mockReturnValue({
            data: [{active_visitors: 30}],
            loading: false,
            error: null
        });

        rerender({enabled: false});

        // Should return 0 when disabled, regardless of new data
        expect(result.current.activeVisitors).toBe(0);
        expect(result.current.error).toBeNull();
    });

    it('resets interval when enabled state changes', () => {
        const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
        const setIntervalSpy = vi.spyOn(global, 'setInterval');

        const {rerender} = renderHook(
            ({enabled}) => useActiveVisitors({enabled}),
            {initialProps: {enabled: true}}
        );

        const firstIntervalId = setIntervalSpy.mock.results[0]?.value;

        // Disable
        rerender({enabled: false});

        expect(clearIntervalSpy).toHaveBeenCalledWith(firstIntervalId);

        // Re-enable
        rerender({enabled: true});

        // Should create a new interval
        expect(setIntervalSpy).toHaveBeenCalledTimes(2);
    });
});