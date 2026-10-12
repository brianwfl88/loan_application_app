import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface ApplicationUpdatedPayload {
  applicationId: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  creditScore?: number;
  creditDecisionReason?: string;
  decidedAt?: string;
  updatedAt?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class ApplicationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ApplicationGateway.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.headers?.authorization?.replace('Bearer ', '') ?? '') ||
        client.handshake.query?.token;

      if (token) {
        const secret = this.configService.get<string>('JWT_SECRET') || 'rhb_super_secure_jwt_secret_key_2026_xyz';
        const payload = this.jwtService.verify(token as string, { secret });
        client.data.user = payload;
        
        // Auto-join user room
        client.join(`user:${payload.sub}`);
        if (payload.role === 'ADMIN') {
          client.join('admin:applications');
        }
        this.logger.log(`Socket client connected & authenticated: ${client.id} (User: ${payload.sub}, Role: ${payload.role})`);
        return;
      }
      this.logger.log(`Socket client connected anonymously: ${client.id}`);
    } catch (err) {
      this.logger.warn(`Socket authentication error for ${client.id}: ${err.message}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:user')
  handleSubscribeUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    if (data?.userId) {
      client.join(`user:${data.userId}`);
      this.logger.log(`Socket ${client.id} explicitly joined user:${data.userId}`);
      return { success: true, room: `user:${data.userId}` };
    }
  }

  @SubscribeMessage('subscribe:admin')
  handleSubscribeAdmin(@ConnectedSocket() client: Socket) {
    client.join('admin:applications');
    this.logger.log(`Socket ${client.id} joined admin:applications`);
    return { success: true, room: 'admin:applications' };
  }

  /**
   * Broadcast status change to the specific customer and admins in real time
   */
  notifyApplicationUpdate(payload: ApplicationUpdatedPayload) {
    this.logger.log(`Pushing real-time update for Application ${payload.applicationId} -> ${payload.status}`);

    // Emit to the specific user's room
    this.server.to(`user:${payload.userId}`).emit('application:updated', payload);

    // Emit to admin room
    this.server.to('admin:applications').emit('application:updated', payload);

    // Also broadcast globally as fallback
    this.server.emit('application:status_changed', payload);
  }
}
