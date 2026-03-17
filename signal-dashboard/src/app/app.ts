import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SignalDashboardComponent } from './components/signal-dashboard.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SignalDashboardComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected title = 'signal-dashboard';
}
