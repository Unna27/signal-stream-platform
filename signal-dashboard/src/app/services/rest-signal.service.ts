import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProcessedSignal } from '../models';

export interface SignalResponse {
  success: boolean;
  data: ProcessedSignal | ProcessedSignal[] | null;
  count?: number;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class RestSignalService {
  private readonly apiUrl = environment.apiGatewayUrl;

  constructor(private http: HttpClient) {}

  getSignalById(signalId: string): Observable<SignalResponse> {
    return this.http.get<SignalResponse>(`${this.apiUrl}/signal/${signalId}`);
  }

  /**
   * Get signals by date range
   * @param startTimestamp Unix timestamp in milliseconds
   * @param endTimestamp Unix timestamp in milliseconds
   */
  getSignalsByDateRange(
    startTimestamp: number,
    endTimestamp: number,
  ): Observable<SignalResponse> {
    const params = new HttpParams()
      .set('start', startTimestamp.toString())
      .set('end', endTimestamp.toString());

    return this.http.get<SignalResponse>(`${this.apiUrl}/signals/range`, {
      params,
    });
  }

  /**
   * Get signals for the last N hours
   * @param hours Number of hours to go back
   */
  getSignalsLastNHours(hours: number): Observable<SignalResponse> {
    const endTimestamp = Date.now();
    const startTimestamp = endTimestamp - hours * 60 * 60 * 1000;
    return this.getSignalsByDateRange(startTimestamp, endTimestamp);
  }

  getSignalsToday(): Observable<SignalResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startTimestamp = today.getTime();
    const endTimestamp = Date.now();
    return this.getSignalsByDateRange(startTimestamp, endTimestamp);
  }

  getSignalsLast24Hours(): Observable<SignalResponse> {
    return this.getSignalsLastNHours(24);
  }

  getSignalsLast7Days(): Observable<SignalResponse> {
    return this.getSignalsLastNHours(24 * 7);
  }

  getSignalsLast30Days(): Observable<SignalResponse> {
    return this.getSignalsLastNHours(24 * 30);
  }
}
