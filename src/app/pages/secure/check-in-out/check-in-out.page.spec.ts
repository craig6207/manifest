import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CheckInOutPage } from './check-in-out.page';

describe('CheckInOutPage', () => {
  let component: CheckInOutPage;
  let fixture: ComponentFixture<CheckInOutPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CheckInOutPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
