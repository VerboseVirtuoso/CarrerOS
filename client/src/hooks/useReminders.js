import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import useAppStore from '../store/useAppStore';

/**
 * Hook to manage job follow-up reminders.
 * Syncs reminder count to Zustand and provides actions to snooze/dismiss.
 */
const useReminders = () => {
  const queryClient = useQueryClient();
  const setReminderCount = useAppStore((state) => state.setReminderCount);

  // 1. Fetch reminders with React Query
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const response = await api.get('/reminders');
      return response.data.data; // { activeReminders, snoozedReminders, totalStale }
    },
    // Poll every 5 minutes (300,000ms)
    refetchInterval: 300000,
  });

  // 2. Sync count to global store whenever data changes
  useEffect(() => {
    if (data?.activeReminders) {
      setReminderCount(data.activeReminders.length);
    }
  }, [data, setReminderCount]);

  // 3. Snooze Mutation
  const snoozeMutation = useMutation({
    mutationFn: async ({ id, days }) => {
      return api.patch(`/jobs/${id}/snooze`, { days });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  // 4. Dismiss (Un-snooze) Mutation
  const dismissMutation = useMutation({
    mutationFn: async (id) => {
      return api.patch(`/jobs/${id}/unsnooze`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  return {
    reminders: data?.activeReminders || [],
    snoozed: data?.snoozedReminders || [],
    isLoading,
    snooze: (id, days = 3) => snoozeMutation.mutate({ id, days }),
    dismiss: (id) => dismissMutation.mutate(id),
  };
};

export default useReminders;
