import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataService } from '../../shared/data.service';
import {Observable} from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/map';
// import {DataService} from "../../shared/data.service";

@Component({
  selector: 'app-schedulejob',
  templateUrl: './schedulejob.component.html',
  styleUrls: ['./schedulejob.component.css']
})
export class SchedulejobComponent implements OnInit {
  Scheduling: FormGroup;
  constructor(private fb: FormBuilder, private dataService: DataService) {
    this.Scheduling = fb.group({
      'jobname': [null, Validators.required],
      'jobdate': [null, Validators.required],
      'jobtime': [null, Validators.required],
      'NoofRecods': [null, Validators.required],
      'mailids': [null, Validators.required],
      'filepath': [null, Validators.required],
    });
  }
public days=[];
public Timeing=[];
  ngOnInit() {
    for(let i=0;i<31;i++){
      this.days.push(i+1)
    }
    this.loadTime()
  }

  loadTime(){
    var x =2; //minutes interval
    var times = []; // time array
    var tt = 0; // start time
    var ap = ['AM', 'PM']; // AM-PM

    //loop to increment the time and push results in array
    for (var i=0;tt<24*60; i++) {
    var hh = Math.floor(tt/60); // getting hours of day in 0-24 format
    var mm = (tt%60); // getting minutes of the hour in 0-55 format
    times[i] = ("0" + (hh % 12)).slice(-2) + ':' + ("0" + mm).slice(-2) + ' '+ap[Math.floor(hh/12)]; // pushing data in array in [00:00 - 12:00 AM/PM format]
    this.Timeing.push({"value":hh+":"+mm,"text":times[i]})
    tt = tt + x;
    }
  }
  scheduleForm(form) {
    this.dataService.postmethod("scheduleWrite",form)
    .subscribe(response => {
      alert(response);
    });

    // console.log(form)
    // this.dataService.postmethod("scheduleWrite",form).subscribe(data ==>{
    //   console.log(data)
    // })

  }
}
