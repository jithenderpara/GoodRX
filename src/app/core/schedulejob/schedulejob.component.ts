import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
// import {DataService} from "../../shared/data.service";

@Component({
  selector: 'app-schedulejob',
  templateUrl: './schedulejob.component.html',
  styleUrls: ['./schedulejob.component.css']
})
export class SchedulejobComponent implements OnInit {
 Scheduling:FormGroup;
  constructor(private fb:FormBuilder) { 
this.Scheduling = fb.group({
  'jobname':[null, Validators.required],
  'jobdate':[null, Validators.required],
  'jobtime':[null, Validators.required],
  'NoofRecods':[null, Validators.required],
  'mailids':[null, Validators.required],
})

  }

  ngOnInit() {
  }
scheduleForm(form){
  console.log(form)

}
}
