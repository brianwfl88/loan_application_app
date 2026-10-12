import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import { ApplicationStatus } from '../types';

export interface ApplicationUpdatePayload {
  applicationId: string;
  userId: string;
  status: ApplicationStatus;
  creditScore?: number;
  creditDecisionReason?: string;
  decidedAt?: string;
}

export function useApplicationSocket(onUpdate?: (event: ApplicationUpdatePayload) => void) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const socket = getSocket();

    // Ensure room subscription
    socket.emit('subscribe:user', { userId: user.id });
    if (user.role === 'ADMIN') {
      socket.emit('subscribe:admin');
    }

    const handleUpdate = (data: ApplicationUpdatePayload) => {
      console.log('⚡ Real-time status update received via WebSocket:', data);

      // Invalidate relevant React Query caches to trigger automatic UI re-render
      queryClient.invalidateQueries({ queryKey: ['my-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-applications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      queryClient.invalidateQueries({ queryKey: ['application', data.applicationId] });

      // Call optional custom callback
      if (onUpdate) {
        onUpdate(data);
      }
    };

    socket.on('application:updated', handleUpdate);
    socket.on('application:status_changed', handleUpdate);

    return () => {
      socket.off('application:updated', handleUpdate);
      socket.off('application:status_changed', handleUpdate);
    };
  }, [user, queryClient, onUpdate]);
}
