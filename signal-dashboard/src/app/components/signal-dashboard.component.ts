import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import {
  BaseChartDirective,
  provideCharts,
  withDefaultRegisterables,
} from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { Subject, interval, takeUntil, switchMap, Observable } from 'rxjs';
import { WebsocketSignalService } from '../services/websocket-signal.service';
import {
  RestSignalService,
  SignalResponse,
} from '../services/rest-signal.service';
import { ProcessedSignal } from '../models';
import { NgZone } from '@angular/core';

interface SignalStats {
  count: number;
  avgValue: number;
  avgProcessedValue: number;
  minValue: number;
  maxValue: number;
  minProcessedValue: number;
  maxProcessedValue: number;
  weakCount: number;
  mediumCount: number;
  strongCount: number;
  signalsPerSecond: number;
}

@Component({
  selector: 'app-signal-dashboard',
  standalone: true,
  imports: [CommonModule, HttpClientModule, BaseChartDirective],
  templateUrl: './signal-dashboard.component.html',
  styleUrl: './signal-dashboard.component.css',
  providers: [
    WebsocketSignalService,
    RestSignalService,
    provideCharts(withDefaultRegisterables()),
  ],
})
export class SignalDashboardComponent implements OnInit, OnDestroy {
  @ViewChild('valueChart') valueChart!: BaseChartDirective;
  @ViewChild('strengthChart') strengthChart!: BaseChartDirective;
  @ViewChild('rateChart') rateChart!: BaseChartDirective;

  currentSignal: ProcessedSignal | null = null;
  isConnected = false;

  historicalSignals: ProcessedSignal[] = [];
  loading = false;
  selectedTimeRange = '24h';

  stats: SignalStats = {
    count: 0,
    avgValue: 0,
    avgProcessedValue: 0,
    minValue: 0,
    maxValue: 0,
    minProcessedValue: 0,
    maxProcessedValue: 0,
    weakCount: 0,
    mediumCount: 0,
    strongCount: 0,
    signalsPerSecond: 0,
  };

  signalValueChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        label: 'Original Value',
        data: [],
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96,165,250,0.2)',
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: false,
        pointBackgroundColor: '#3b82f6',
      },
      {
        label: 'Processed Value',
        data: [],
        borderColor: '#34d399',
        backgroundColor: 'rgba(52,211,153,0.2)',
        borderWidth: 3,
        pointRadius: 4,
        tension: 0.35,
        fill: false,
        pointBackgroundColor: '#10b981',
      },
    ],
  };

  signalStrengthChartData: ChartData<'doughnut'> = {
    labels: ['Weak', 'Medium', 'Strong'],
    datasets: [
      {
        label: 'Signal Strength Distribution',
        data: [0, 0, 0],
        backgroundColor: ['#ef4444', '#f59e0b', '#10b981'],
      },
    ],
  };

  signalsPerSecondChartData: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        label: 'Signal Rate (signals/sec)',
        data: [],
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
        tension: 0.4,
        fill: true,
        pointRadius: 2,
        pointBackgroundColor: '#f59e0b',
      },
    ],
  };

  signalValueChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      title: {
        display: true,
        text: 'Signal Values Over Time',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  signalStrengthChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'right',
      },
      title: {
        display: true,
        text: 'Signal Strength Distribution',
      },
      tooltip: {
        callbacks: {
          label: function (context) {
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0,
            );
            const value = context.raw as number;
            const percent = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value} (${percent}%)`;
          },
        },
      },
    },
    cutout: '60%', // makes it look like a doughnut instead of a pie
  };

  signalsPerSecondChartOptions: ChartConfiguration<'line'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      title: {
        display: true,
        text: 'Signal Rate Over Time (Signals per Second)',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  private destroy$ = new Subject<void>();
  private signalTimestamps: number[] = [];

  constructor(
    private websocketService: WebsocketSignalService,
    private restService: RestSignalService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.websocketService.connect().subscribe({
      next: (connected) => {
        console.log('Connected to signal gateway');
      },
      error: (error) => {
        console.error('Failed to connect to gateway:', error);
      },
    });

    this.websocketService.signal$
      .pipe(takeUntil(this.destroy$))
      .subscribe((signal) => {
        this.ngZone.run(() => {
          if (!signal) return;

          this.currentSignal = {
            ...signal,
            timestamp: Number(signal.timestamp),
            processedAt: Number(new Date(signal.processedAt)),
            value: Number(signal.value),
            processedValue: Number(signal.processedValue),
          };

          console.info('LIVE SIGNAL', this.currentSignal);

          this.signalTimestamps.push(Date.now());

          const oneMinuteAgo = Date.now() - 60000;
          this.signalTimestamps = this.signalTimestamps.filter(
            (ts) => ts > oneMinuteAgo,
          );

          this.updateStats();
          this.cdr.detectChanges();
        });
      });

    this.websocketService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        this.isConnected = status;
      });

    this.loadHistoricalData();

    // Refresh historical data periodically (every 30 seconds)
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadHistoricalData());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.websocketService.disconnect();
  }

  loadHistoricalData(): void {
    this.loadHistoricalDataByTimeRange().subscribe({
      next: (response: SignalResponse) => {
        console.info(`Received historical data: ${JSON.stringify(response)}`);
        this.ngZone.run(() => {
          if (response.success && Array.isArray(response.data)) {
            this.historicalSignals = response.data.map((s) => ({
              ...s,
              timestamp: Number(s.timestamp),
              value: Number(s.value),
              processedValue: Number(s.processedValue),
            }));
            console.info(
              `Loaded ${this.historicalSignals.length} historical signals`,
            );
            this.updateChartsData();
            this.updateStats();
            this.cdr.detectChanges();
          }
        });
      },
      error: (error) => {
        console.error('Failed to load historical data:', error);
      },
    });
  }

  private loadHistoricalDataByTimeRange(): Observable<SignalResponse> {
    this.loading = true;

    switch (this.selectedTimeRange) {
      case '24h':
        return this.restService.getSignalsLast24Hours();
      case '7d':
        return this.restService.getSignalsLast7Days();
      case '30d':
        return this.restService.getSignalsLast30Days();
      case 'today':
        return this.restService.getSignalsToday();
      default:
        return this.restService.getSignalsLast24Hours();
    }
  }

  changeTimeRange(range: string): void {
    this.selectedTimeRange = range;
    this.loadHistoricalData();
  }

  private updateChartsData(): void {
    const signals = this.historicalSignals;

    if (signals.length === 0) {
      return;
    }

    const sortedSignals = [...signals].sort(
      (a, b) => a.timestamp - b.timestamp,
    );

    const labels = sortedSignals.map((s) =>
      new Date(Number(s.timestamp)).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    );

    const values = sortedSignals.map((s) => Number(s.value));
    const processedValues = sortedSignals.map((s) => Number(s.processedValue));

    this.ngZone.run(() => {
      this.signalValueChartData.labels = [...labels];

      this.signalValueChartData.datasets[0].data = [...values];
      this.signalValueChartData.datasets[1].data = [...processedValues];

      this.updateSignalsPerSecondChart(sortedSignals);

      if (this.valueChart?.chart) {
        this.valueChart.chart.update();
      }
    });
  }

  private updateSignalsPerSecondChart(signals: ProcessedSignal[]): void {
    if (signals.length < 2) {
      return;
    }

    const buckets: Record<number, number> = {};

    signals.forEach((signal) => {
      const second = Math.floor(Number(signal.timestamp) / 1000);

      buckets[second] = (buckets[second] || 0) + 1;
    });

    const sortedSeconds = Object.keys(buckets)
      .map(Number)
      .sort((a, b) => a - b);

    const labels = sortedSeconds.map((sec) =>
      new Date(sec * 1000).toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    );

    const data = sortedSeconds.map((sec) => buckets[sec]);

    this.signalsPerSecondChartData.labels = labels;
    this.signalsPerSecondChartData.datasets[0].data = data;

    this.rateChart?.chart?.update();
  }

  private updateStats(): void {
    const allSignals =
      this.historicalSignals.length > 0
        ? this.historicalSignals
        : this.currentSignal
          ? [this.currentSignal]
          : [];

    if (allSignals.length === 0) {
      return;
    }

    const values = allSignals.map((s) => Number(s.value));
    const processedValues = allSignals.map((s) => Number(s.processedValue));
    const strengths = allSignals.map((s) => s.strength);

    this.stats = {
      count: allSignals.length,
      avgValue: values.reduce((a, b) => a + b, 0) / values.length,
      avgProcessedValue:
        processedValues.reduce((a, b) => a + b, 0) / processedValues.length,
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
      minProcessedValue: Math.min(...processedValues),
      maxProcessedValue: Math.max(...processedValues),
      weakCount: strengths.filter((s) => s === 'weak').length,
      mediumCount: strengths.filter((s) => s === 'medium').length,
      strongCount: strengths.filter((s) => s === 'strong').length,
      signalsPerSecond:
        this.signalTimestamps.length > 0
          ? ((this.signalTimestamps.length / 60).toFixed(2) as any)
          : 0,
    };

    this.signalStrengthChartData.datasets[0].data = [
      this.stats.weakCount,
      this.stats.mediumCount,
      this.stats.strongCount,
    ];
    console.log(
      'Updated stats:',
      this.stats.weakCount,
      this.stats.mediumCount,
      this.stats.strongCount,
    );
    if (this.strengthChart?.chart) {
      this.strengthChart.chart.update();
    }
  }

  getStrengthColor(strength: string): string {
    switch (strength) {
      case 'weak':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'strong':
        return '#10b981';
      default:
        return '#808080';
    }
  }

  getConnectionStatusColor(): string {
    return this.isConnected ? '#10b981' : '#ef4444';
  }
}
