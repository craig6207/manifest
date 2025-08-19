import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimesheetsEditPage } from './timesheets-edit.page';

describe('TimesheetsEditPage', () => {
  let component: TimesheetsEditPage;
  let fixture: ComponentFixture<TimesheetsEditPage>;

  beforeEach(async () => {
    fixture = TestBed.createComponent(TimesheetsEditPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
