import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GuestJobSearchPage } from './guest-job-search.page';

describe('GuestJobSearchPage', () => {
  let component: GuestJobSearchPage;
  let fixture: ComponentFixture<GuestJobSearchPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GuestJobSearchPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
