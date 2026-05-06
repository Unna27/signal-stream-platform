import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { ProcessedSignal } from '../models';

@Injectable({
  providedIn: 'root',
})
export class WebsocketSignalService {
  private socket: Socket | null = null;
  private readonly signalSubject = new BehaviorSubject<ProcessedSignal | null>(
    null,
  );
  private readonly connectionStatusSubject = new BehaviorSubject<boolean>(
    false,
  );
  private readonly signalHistorySubject = new BehaviorSubject<
    ProcessedSignal[]
  >([]);

  public signal$ = this.signalSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public signalHistory$ = this.signalHistorySubject.asObservable();

  constructor() {}

  connect(url: string = environment.apiGatewayUrl): Observable<boolean> {
    return new Observable((observer) => {
      if (this.socket?.connected) {
        observer.next(true);
        observer.complete();
        return;
      }

      this.socket = io(url, {
        reconnectionDelay: 1000,
        reconnection: true,
        reconnectionAttempts: 10,
        transports: ['websocket', 'polling'],
      });
      console.log('Attempting to connect to signal gateway at:', url);
      console.log('Socket instance created:', this.socket);
      this.socket.on('connected', (data: any) => {
        console.log('Connected to signal gateway:', JSON.stringify(data));
        this.connectionStatusSubject.next(true);
        observer.next(true);
        observer.complete();
      });

      this.socket.on('signal', (signal: ProcessedSignal) => {
        console.log('Received signal:', JSON.stringify(signal));
        this.signalSubject.next(signal);

        // Add to history (keep last 100 signals)
        const currentHistory = this.signalHistorySubject.value;
        const newHistory = [signal, ...currentHistory].slice(0, 100);
        this.signalHistorySubject.next(newHistory);
      });

      this.socket.on('disconnect', () => {
        console.log('Disconnected from signal gateway');
        this.connectionStatusSubject.next(false);
      });

      this.socket.on('error', (error: any) => {
        console.error('WebSocket error:', error);
        observer.error(error);
      });

      // Fallback timeout for connection failure
      setTimeout(() => {
        if (!this.socket?.connected) {
          observer.error(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionStatusSubject.next(false);
    }
  }

  getCurrentSignal(): ProcessedSignal | null {
    return this.signalSubject.value;
  }

  isConnected(): boolean {
    return this.connectionStatusSubject.value;
  }

  getSignalHistory(): ProcessedSignal[] {
    return this.signalHistorySubject.value;
  }

  clearHistory(): void {
    this.signalHistorySubject.next([]);
  }
}
