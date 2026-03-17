import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import 'chartjs-adapter-date-fns';
import { App } from './app/app';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));
