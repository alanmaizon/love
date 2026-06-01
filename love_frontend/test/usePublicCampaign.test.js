import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { usePublicCampaign } from '../src/hooks/usePublicCampaign';
import axiosInstance from '../src/api/axiosInstance';

vi.mock('../src/api/axiosInstance', () => ({
  default: { get: vi.fn() },
}));

describe('usePublicCampaign', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads by slug', async () => {
    axiosInstance.get.mockResolvedValueOnce({
      data: { slug: 'x', title: 'X', host_display_name: 'A & B', story: 'Hi' },
    });

    const { result } = renderHook(() => usePublicCampaign('x'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(axiosInstance.get).toHaveBeenCalledWith('/campaign/x/');
    expect(result.current.campaign.title).toBe('X');
    expect(result.current.profile.bride_name).toBe('A');
  });

  it('loads flagship when slug omitted', async () => {
    axiosInstance.get.mockResolvedValueOnce({
      data: { slug: 'anna-and-alan', title: 'Flagship' },
    });

    const { result } = renderHook(() => usePublicCampaign());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(axiosInstance.get).toHaveBeenCalledWith('/campaign/');
  });
});
