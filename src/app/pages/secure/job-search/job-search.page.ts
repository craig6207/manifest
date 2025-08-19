import { Component } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-job-search',
  templateUrl: 'job-search.page.html',
  styleUrls: ['job-search.page.scss'],
  imports: [IonHeader, IonToolbar, IonTitle, IonContent],
})
export class JobSearchPage {
  constructor() {}
}
