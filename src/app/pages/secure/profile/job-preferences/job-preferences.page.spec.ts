import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JobPreferencesPage } from './job-preferences.page';

describe('JobPreferencesPage', () => {
  let component: JobPreferencesPage;
  let fixture: ComponentFixture<JobPreferencesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(JobPreferencesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
