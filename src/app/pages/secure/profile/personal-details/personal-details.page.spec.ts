import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PersonalDetailsPage } from './personal-details.page';

describe('PersonalDetailsPage', () => {
  let component: PersonalDetailsPage;
  let fixture: ComponentFixture<PersonalDetailsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PersonalDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
