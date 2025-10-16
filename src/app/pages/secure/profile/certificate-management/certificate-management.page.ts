import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular/standalone';

@Component({
  selector: 'app-certificate-management',
  templateUrl: './certificate-management.page.html',
  styleUrls: ['./certificate-management.page.scss'],
  standalone: true,
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule]
})
export class CertificateManagementPage implements OnInit {

  constructor() { }

  ngOnInit() {
  }

}
