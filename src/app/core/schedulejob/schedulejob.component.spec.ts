import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SchedulejobComponent } from './schedulejob.component';

describe('SchedulejobComponent', () => {
  let component: SchedulejobComponent;
  let fixture: ComponentFixture<SchedulejobComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SchedulejobComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SchedulejobComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
