import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CertificateManagementPage } from './certificate-management.page';

describe('CertificateManagementPage', () => {
  let component: CertificateManagementPage;
  let fixture: ComponentFixture<CertificateManagementPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CertificateManagementPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
