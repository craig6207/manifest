import { ComponentFixture, TestBed } from '@angular/core/testing';

import { JobSearchPage } from './job-search.page';

describe('JobSearchPage', () => {
  let component: JobSearchPage;
  let fixture: ComponentFixture<JobSearchPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(JobSearchPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
