import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimesheetLogPage } from './timesheet-log.page';

describe('TimesheetLogPage', () => {
  let component: TimesheetLogPage;
  let fixture: ComponentFixture<TimesheetLogPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TimesheetLogPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
