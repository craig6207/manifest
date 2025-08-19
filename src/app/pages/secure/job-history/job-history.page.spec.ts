import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JobHistoryPage } from './job-history.page';

describe('JobHistoryPage', () => {
  let component: JobHistoryPage;
  let fixture: ComponentFixture<JobHistoryPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(JobHistoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
